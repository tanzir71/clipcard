import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { expect, test } from './site-fixture';
import jsQR from 'jsqr';
import {
  GIFS_RELEASED,
  VIDEO_JOIN_RELEASED,
} from '../../packages/core/flags.ts';

const preview = process.env.CLIPCARD_TEST_R6_PREVIEW === '1';
const file = (name: string) =>
  fileURLToPath(new URL('../../fixtures/pages/' + name, import.meta.url));
const sourceLinks = [
  'https://example.org/river#a',
  'https://example.net/ferry',
] as const;

test('joins two local clips, an excerpt and a GIF and exports both source QRs', async ({
  page,
}, info) => {
  test.skip(!VIDEO_JOIN_RELEASED && !preview, 'R6 preview build required');
  test.setTimeout(140_000);
  await page.goto('./');
  await page
    .getByRole('textbox', {
      name: 'Paste a link, text or an image to add a source',
    })
    .fill('The first ferry left the dock before sunrise.');
  await page.getByRole('button', { name: 'Make card', exact: true }).click();
  await expect(page.locator('.cc-headline').first()).toContainText(
    'The first ferry',
  );

  const videoData = (await readFile(file('video.mp4'))).toString('base64');
  await page.evaluate(
    async ({ video, urls }) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('clipcard');
        request.onsuccess = () => resolve(request.result);
        request.onerror = reject;
      });
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(['prefs', 'drafts', 'clips'], 'readwrite');
        tx.oncomplete = () => resolve();
        tx.onerror = reject;
        const current = tx.objectStore('prefs').get('currentDraftId');
        current.onsuccess = () => {
          const request = tx.objectStore('drafts').get(current.result);
          request.onsuccess = () => {
            const draft = request.result;
            const blob = new Blob(
              [Uint8Array.from(atob(video), (byte) => byte.charCodeAt(0))],
              { type: 'video/mp4' },
            );
            const order = urls.map((sourceUrl, index) => {
              const id = 'project-recording-' + index;
              const timestamp = new URL(sourceUrl);
              timestamp.hash = 't=' + (index + 8);
              tx.objectStore('clips').put({
                id,
                draftId: draft.id,
                kind: 'video',
                title: index ? 'Ferry news' : 'River report',
                outlet: index ? 'Ferry source' : 'River source',
                sourceUrl: timestamp.href,
                mediaType: 'video/mp4',
                embeddedMedia: blob,
                video: {
                  source: sourceUrl,
                  start: 8 + index,
                  end: 11.5 + index,
                  cues: [
                    { start: 0.3, end: 1.8, text: 'A local test caption.' },
                  ],
                },
                createdAt: Date.now(),
              });
              return id;
            });
            tx.objectStore('drafts').put({
              ...draft,
              mode: 'video',
              order: [...order, ...draft.order],
            });
          };
        };
      });
      db.close();
    },
    { video: videoData, urls: sourceLinks },
  );
  await page.reload();
  const timeline = page.getByLabel('Timeline');
  await expect(
    timeline.getByRole('button', { name: 'Video clip', exact: true }),
  ).toHaveCount(2);
  await page.getByRole('button', { name: 'Add scene', exact: true }).click();
  await page
    .locator('.clip-library input[type=file]')
    .setInputFiles(file('reaction.gif'));
  await page.getByRole('button', { name: 'Add 1', exact: true }).click();
  await expect(
    timeline.getByRole('button', { name: 'Reaction', exact: true }),
  ).toBeVisible();
  await expect(
    timeline.getByRole('button', { name: 'Excerpt', exact: true }),
  ).toBeVisible();
  await timeline
    .getByRole('button', { name: 'Video clip', exact: true })
    .first()
    .click();
  await page.getByRole('button', { name: /^Auto · 9:16/ }).click();
  await expect(
    page.getByRole('spinbutton', { name: 'End of clip' }),
  ).toHaveValue('3.5');
  await page.getByRole('spinbutton', { name: 'End of clip' }).fill('2');
  await page.getByRole('spinbutton', { name: 'End of clip' }).press('Tab');
  await expect(
    page.getByRole('spinbutton', { name: 'End of clip' }),
  ).toHaveValue('2');
  await timeline.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(
    timeline.getByRole('button', { name: 'Pause', exact: true }),
  ).toBeVisible();

  const pending = page.waitForEvent('download', { timeout: 100_000 });
  await page.getByRole('button', { name: /^Export ·/ }).click();
  const video = await pending;
  expect(video.suggestedFilename()).toMatch(/\.(mp4|webm)$/);
  const path = info.outputPath(video.suggestedFilename());
  await video.saveAs(path);
  const data = (await readFile(path)).toString('base64');

  const credits = await page.evaluate(
    async ({ data, type }) => {
      const blob = new Blob(
        [Uint8Array.from(atob(data), (character) => character.charCodeAt(0))],
        { type },
      );
      const player = document.createElement('video');
      player.width = 100;
      player.muted = true;
      player.src = URL.createObjectURL(blob);
      document.body.append(player);
      await new Promise<void>((resolve, reject) => {
        player.onloadeddata = () => resolve();
        player.onerror = reject;
      });
      const last = player.duration - 1;
      const frame = new Promise<void>((resolve) => {
        const check: VideoFrameRequestCallback = (_, { mediaTime }) => {
          if (Math.abs(mediaTime - last) < 0.12) resolve();
          else player.requestVideoFrameCallback(check);
        };
        player.requestVideoFrameCallback(check);
      });
      player.currentTime = last;
      await frame;
      const surface = document.createElement('canvas');
      surface.width = player.videoWidth;
      surface.height = player.videoHeight;
      const ctx = surface.getContext('2d')!;
      ctx.drawImage(player, 0, 0);
      return {
        dimensions: [player.videoWidth, player.videoHeight],
        duration: player.duration,
        first: Array.from(ctx.getImageData(38, 588, 264, 264).data),
        second: Array.from(ctx.getImageData(38, 856, 264, 264).data),
      };
    },
    {
      data,
      type: video.suggestedFilename().endsWith('.mp4')
        ? 'video/mp4'
        : 'video/webm',
    },
  );
  expect(credits.dimensions).toEqual([1080, 1920]);
  expect(credits.duration).toBeGreaterThan(16);
  expect(jsQR(new Uint8ClampedArray(credits.first), 264, 264)?.data).toBe(
    'https://example.org/river#t=8',
  );
  expect(jsQR(new Uint8ClampedArray(credits.second), 264, 264)?.data).toBe(
    'https://example.net/ferry#t=9',
  );
});

test('searches KLIPY on demand with attribution and provider settings', async ({
  page,
}) => {
  test.skip(!GIFS_RELEASED && !preview, 'R6 preview build required');
  let count = 0;
  await page.route(
    'https://api.klipy.com/api/v1/mock-key/gifs/search**',
    async (route) => {
      count++;
      const query = new URL(route.request().url()).searchParams;
      expect(query.get('q')).toBe('ferry');
      expect(query.get('content_filter')).toBe('medium');
      await route.fulfill({
        json: {
          data: {
            data: [
              {
                id: 1,
                slug: 'ferry-loop',
                title: 'Ferry loop',
                username: 'fixture creator',
                file: {
                  sm: { gif: { url: 'https://static.klipy.com/fixture.gif' } },
                },
              },
            ],
          },
        },
      });
    },
  );
  await page.route('https://static.klipy.com/fixture.gif', (route) =>
    route.fulfill({ path: file('reaction.gif'), contentType: 'image/gif' }),
  );
  await page.goto('./');
  await page.getByRole('button', { name: 'GIFs', exact: true }).click();
  expect(count).toBe(0);
  await page.getByRole('button', { name: 'GIF provider', exact: true }).click();
  await page.getByLabel('API key').fill('mock-key');
  await page.getByRole('button', { name: 'Save key', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText(
    'Key saved in this browser.',
  );
  await page.getByRole('searchbox', { name: 'Search KLIPY' }).fill('ferry');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.getByText('Powered by KLIPY')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Ferry loop' })).toHaveAttribute(
    'href',
    'https://klipy.com/gifs/ferry-loop',
  );
  await expect(
    page.getByText('fixture creator', { exact: true }),
  ).toBeVisible();
  expect(count).toBe(1);
});

test('shows GIPHY branding and uses the selected provider key', async ({
  page,
}) => {
  test.skip(!GIFS_RELEASED && !preview, 'R6 preview build required');
  let requested = false;
  await page.route('https://api.giphy.com/v1/gifs/search**', async (route) => {
    const query = new URL(route.request().url()).searchParams;
    expect(query.get('api_key')).toBe('mock-giphy-key');
    expect(query.get('q')).toBe('boat');
    expect(query.get('rating')).toBe('pg-13');
    requested = true;
    await route.fulfill({
      json: {
        data: [
          {
            id: 'ferry',
            title: 'A boat',
            url: 'https://giphy.com/gifs/boat-ferry',
            username: 'fixture creator',
            images: {
              fixed_height: { url: 'https://media.giphy.com/fixture.gif' },
            },
          },
        ],
      },
    });
  });
  await page.route('https://media.giphy.com/fixture.gif', (route) =>
    route.fulfill({ path: file('reaction.gif'), contentType: 'image/gif' }),
  );
  await page.goto('./');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'GIF provider', exact: true })
    .selectOption('giphy');
  await page.getByLabel('API key').fill('mock-giphy-key');
  await page.getByRole('button', { name: 'Save key', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText(
    'Key saved in this browser.',
  );
  await page.getByRole('button', { name: 'GIFs', exact: true }).click();
  expect(requested).toBe(false);
  await page.getByRole('searchbox', { name: 'Search GIPHY' }).fill('boat');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(
    page.getByRole('img', { name: 'Powered by GIPHY' }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'A boat' })).toHaveAttribute(
    'href',
    'https://giphy.com/gifs/boat-ferry',
  );
});
