import { readFile } from 'node:fs/promises';
import { expect, test } from './site-fixture';

test('installs a scoped service worker and opens a shared link while offline', async ({
  page,
  context,
  request,
  baseURL,
}) => {
  if (!baseURL) throw new Error('App base URL missing');
  const manifest = await (await request.get('manifest.webmanifest')).json();
  expect(manifest.scope).toBe('/clipcard/app/');
  expect(manifest.share_target.method).toBe('POST');
  expect(manifest.share_target.params.files.name).toBe('photo');

  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'canShare', { value: () => true });
    Object.defineProperty(navigator, 'share', {
      value: (payload: ShareData) => {
        document.body.dataset.sharedType = payload.files?.[0]?.type;
        return Promise.resolve();
      },
    });
  });
  await page.goto('./');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    )
    .toBe(true);
  await context.setOffline(true);

  // A multipart form navigation matches the Android Web Share Target delivery.
  await page.evaluate((action) => {
    const form = document.createElement('form');
    form.action = action;
    form.method = 'POST';
    form.enctype = 'multipart/form-data';
    const field = document.createElement('input');
    field.name = 'url';
    field.value = 'https://publisher.example/city/river-buses?utm_medium=share';
    form.append(field);
    document.body.append(form);
    form.submit();
  }, new URL('share/', baseURL).href);
  await expect(page.getByText('Shared into Clipcard')).toBeVisible();
  await expect(page.locator('.cc-headline')).toHaveText('River Buses');
  await expect(page.locator('.clip-editor')).toContainText(
    'No photo came with the link.',
  );
  await expect(
    page.getByRole('button', { name: 'Share', exact: true }),
  ).toBeVisible();
  await expect
    .poll(async () => {
      await page.getByRole('button', { name: 'Share', exact: true }).click();
      return page.locator('body').getAttribute('data-shared-type');
    })
    .toBe('image/png');
  await page.reload();
  await expect(page.locator('.cc-headline')).toHaveText('River Buses');
});

test('accepts an MP4 share offline and keeps the playable clip in its draft', async ({
  page,
  context,
  request,
  baseURL,
}) => {
  if (!baseURL) throw new Error('App base URL missing');
  const manifest = await (await request.get('manifest.webmanifest')).json();
  expect(manifest.share_target.params.files.accept).toContain('video/mp4');

  const media = await readFile(
    new URL('../../fixtures/pages/video.mp4', import.meta.url),
  );
  await page.goto('./');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    )
    .toBe(true);
  await context.setOffline(true);

  await page.evaluate(
    ({ action, data }) => {
      const form = document.createElement('form');
      form.action = action;
      form.method = 'POST';
      form.enctype = 'multipart/form-data';
      const field = document.createElement('input');
      field.name = 'photo';
      field.type = 'file';
      const transfer = new DataTransfer();
      transfer.items.add(
        new File([new Uint8Array(data)], 'shared-clip.mp4', {
          type: 'video/mp4',
        }),
      );
      field.files = transfer.files;
      form.append(field);
      document.body.append(form);
      form.submit();
    },
    { action: new URL('share/', baseURL).href, data: [...media] },
  );

  const clip = page.locator('.clip-project-scenes button[draggable="true"]');
  await expect(clip).toHaveCount(1);
  await clip.click();
  await expect
    .poll(() =>
      page
        .locator('.clip-project-preview video')
        .first()
        .evaluate((el) => (el as HTMLVideoElement).videoWidth),
    )
    .toBeGreaterThan(0);
  await page.reload();
  await expect(clip).toHaveCount(1);
});
