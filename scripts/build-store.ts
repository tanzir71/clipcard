import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const workspace = new URL('../', import.meta.url);
const extension = new URL('apps/extension/', workspace);
const manifestVersion = JSON.parse(
  readFileSync(new URL('package.json', extension), 'utf8'),
).version;
const [version = manifestVersion, preview, ...extra] = process.argv.slice(2);
if (
  !/^\d+\.\d+\.\d+$/.test(version) ||
  (preview && preview !== '--r4-preview') ||
  extra.length
)
  throw new Error('Usage: pnpm build:store [version] [--r4-preview]');
const pnpm = process.env.npm_execpath;
if (!pnpm) throw new Error('Run this script through pnpm build:store');

const child = {
  cwd: fileURLToPath(workspace),
  stdio: 'inherit' as const,
  env: {
    ...process.env,
    CLIPCARD_EXTENSION_VERSION: version,
    CLIPCARD_STORE_PACKAGE: '1',
    VITE_CLIPCARD_DEV_RELEASE: '0',
    VITE_CLIPCARD_LANGUAGES: preview ? '1' : '0',
  },
};
execFileSync(process.execPath, [pnpm, 'prepare:assets'], child);
execFileSync(
  process.execPath,
  [
    pnpm,
    '--filter',
    '@clipcard/extension',
    'exec',
    'wxt',
    'zip',
    '-b',
    'chrome',
    '--mode',
    'store',
  ],
  child,
);
const manifest = JSON.parse(
  readFileSync(
    new URL('.output/chrome-mv3-store/manifest.json', extension),
    'utf8',
  ),
) as {
  version: string;
  permissions?: string[];
  optional_host_permissions?: string[];
  host_permissions?: string[];
  content_scripts?: unknown[];
};
const expected =
  'activeTab,clipboardWrite,contextMenus,offscreen,scripting,storage';
if (
  manifest.version !== version ||
  manifest.permissions?.sort().join(',') !== expected ||
  manifest.optional_host_permissions?.join(',') !== '<all_urls>' ||
  manifest.host_permissions?.length ||
  manifest.content_scripts?.length
)
  throw new Error(
    'Store package manifest differs from the documented permissions or version',
  );
const archive = new URL(
  '.output/clipcard-store-' + version + '.zip',
  extension,
);
const checksum = createHash('sha256')
  .update(readFileSync(archive))
  .digest('hex');
console.log(checksum + '  ' + fileURLToPath(archive));
