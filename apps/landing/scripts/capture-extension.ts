import { execFileSync } from 'node:child_process';
import { mkdtemp, unlink, rmdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = new URL('../../../', import.meta.url);
const require = createRequire(new URL('package.json', root));
const directory = await mkdtemp(join(tmpdir(), 'clipcard-landing-'));
const screenshot = join(directory, 'extension.png');
const destination = fileURLToPath(
  new URL('../src/media/feature-extension.webp', import.meta.url),
);

try {
  execFileSync(
    process.execPath,
    [
      require.resolve('@playwright/test/cli'),
      'test',
      '--project=extension',
      '--workers=1',
      '--grep',
      'copies the linked article with its canonical QR',
    ],
    {
      cwd: root,
      env: { ...process.env, CLIPCARD_LANDING_SCREENSHOT: screenshot },
      stdio: 'inherit',
    },
  );
  await sharp(screenshot)
    .resize({ width: 768, height: 560 })
    .webp({ quality: 85 })
    .toFile(destination);
  console.log(destination);
} finally {
  await unlink(screenshot).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== 'ENOENT') throw error;
  });
  await rmdir(directory);
}
