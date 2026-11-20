import { readFile } from 'node:fs/promises';
import jsQR from 'jsqr';
import { VIDEO_CLIPS_RELEASED } from '../../packages/core/flags.ts';
import { expect, test } from './extension-fixture.ts';

const port = Number(process.env.CLIPCARD_TEST_PORT_BASE ?? 4321) + 1;
const source = 'http://127.0.0.1:' + port + '/video.html';
test.skip(
  !VIDEO_CLIPS_RELEASED && process.env.CLIPCARD_TEST_VIDEO_PREVIEW !== '1',
  'R5 preview build required',
);
test.use({ syntheticVideo: true, instrumentEvents: true });

test('records only the approved player and exports captions and a timestamp QR', async ({
  extension,
  worker,
}, info) => {
  test.setTimeout(65_000);
  const page = await extension.newPage();
  await page.goto(source);
  const player = page.locator('video');
  await expect
    .poll(() =>
      player.evaluate((video) => (video as HTMLVideoElement).readyState),
    )
    .toBeGreaterThan(1);
  await player.hover({ position: { x: 250, y: 150 } });
  await page
    .getByRole('button', { name: 'Clip this video', exact: true })
    .click();
  const start = page.getByRole('slider', { name: 'Start of clip' });
  await expect(start).toHaveAttribute('aria-valuenow', '0');
  const add = page.getByRole('button', { name: 'Add clip' });
  const content = page.locator('body');
  await content.evaluate((body) => (body.dataset.wrongTab = '1'));
  await add.click();
  await expect(
    page.getByText('Choose this tab to record the video.'),
  ).toBeVisible();
  await expect(page.locator('clipcard-popup')).toHaveCount(0);
  await content.evaluate((body) => delete body.dataset.wrongTab);

  const [sheet] = await Promise.all([
    page.waitForEvent('framenavigated', (frame) =>
      frame.url().startsWith(new URL('sheet.html', worker.url()).href),
    ),
    add.click(),
  ]);
  await expect(content).toHaveAttribute('data-cropped', '1');
  await expect(page.locator('clipcard-popup')).toHaveCSS('right', '12px');
  const preview = sheet.locator('.clip-video-preview video');
  await expect(preview).toBeVisible();
  expect(
    await preview.evaluate(
      (node: HTMLVideoElement) => node.textTracks[0]?.cues?.length,
    ),
  ).toBeGreaterThan(0);
  await expect
    .poll(() => preview.evaluate((node: HTMLVideoElement) => node.videoWidth))
    .toBe(640);
  const download = page.waitForEvent('download', { timeout: 38_000 });
  await sheet.getByRole('button', { name: 'Export clip', exact: true }).click();
  const video = await download;
  expect(video.suggestedFilename()).toMatch(/\.(mp4|webm)$/);
  const contentType = video.suggestedFilename().endsWith('.mp4')
    ? 'video/mp4'
    : 'video/webm';
  const file = info.outputPath(video.suggestedFilename());
  await video.saveAs(file);
  const bytes = await readFile(file);

  const decoded = await sheet.evaluate(
    async ({ data, contentType }) => {
      const blob = new Blob(
        [Uint8Array.from(atob(data), (part) => part.charCodeAt(0))],
        { type: contentType },
      );
      const video = document.createElement('video');
      video.muted = true;
      video.preload = 'auto';
      video.width = 100;
      document.body.append(video);
      video.src = URL.createObjectURL(blob);
      await new Promise((resolve, reject) => {
        video.onloadeddata = resolve;
        video.onerror = reject;
      });
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1920;
      const ctx = canvas.getContext('2d')!;
      const at = async (time: number) => {
        const frame = new Promise<void>((resolve) => {
          const inspect: VideoFrameRequestCallback = (_, { mediaTime }) => {
            if (Math.abs(mediaTime - time) < 0.1) resolve();
            else video.requestVideoFrameCallback(inspect);
          };
          video.requestVideoFrameCallback(inspect);
        });
        video.currentTime = time;
        await frame;
        ctx.drawImage(video, 0, 0);
      };
      await at(0.9);
      const captionPixels = ctx.getImageData(400, 1332, 200, 8).data;
      const captionWhite = captionPixels.filter(
        (value, index) => index % 4 === 0 && value > 220,
      ).length;
      await at(video.duration - 1);
      const qr = ctx.getImageData(36, 736, 268, 268);
      const audio = new AudioContext();
      const dataBuffer = await audio.decodeAudioData(await blob.arrayBuffer());
      await audio.close();
      const signal = dataBuffer.getChannelData(0).slice(5000, 9000);
      const energy =
        signal.reduce((sum, sample) => sum + sample * sample, 0) /
        signal.length;
      return {
        qr: Array.from(qr.data),
        qrSize: qr.width,
        duration: video.duration,
        captionWhite,
        energy,
        size: [video.videoWidth, video.videoHeight],
      };
    },
    { data: bytes.toString('base64'), contentType },
  );
  expect(decoded.size).toEqual([1080, 1920]);
  expect(decoded.duration).toBeGreaterThan(6.7);
  expect(decoded.captionWhite).toBeGreaterThan(800);
  expect(decoded.energy).toBeGreaterThan(0.002);
  expect(
    jsQR(new Uint8ClampedArray(decoded.qr), decoded.qrSize, decoded.qrSize)
      ?.data,
  ).toBe(source + '#t=0');

  await sheet.getByRole('button', { name: 'Card', exact: true }).click();
  await expect(sheet.locator('.cc-headline')).toHaveText(
    'The first fixture caption.',
  );
  await expect(sheet.locator('.cc-qr')).toBeVisible();
});

test('protected playback offers a moment card and blocks recording', async ({
  extension,
}) => {
  const page = await extension.newPage();
  await page.goto(source);
  const player = page.locator('video');
  await expect
    .poll(() =>
      player.evaluate((video) => (video as HTMLVideoElement).readyState),
    )
    .toBeGreaterThan(1);
  await player.evaluate((video) => video.dispatchEvent(new Event('encrypted')));
  await player.hover();
  await page
    .getByRole('button', { name: 'Clip this video', exact: true })
    .click();
  await expect(page.getByRole('button', { name: 'Add clip' })).toBeDisabled();
  await expect(page.getByText("This player can't be recorded")).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Card', exact: true }),
  ).toBeEnabled();
  await expect(page.locator('body')).not.toHaveAttribute('data-cropped');
});
