import { browser } from 'wxt/browser';

const repo = import.meta.env.VITE_CLIPCARD_REPO || 'tanzir71/clipcard';
const cacheKey = 'developerReleaseCheck';
const day = 24 * 60 * 60 * 1000;
let pending: Promise<string | null> | undefined;

export function isNewer(candidate: string, installed: string): boolean {
  if (!/^v\d+\.\d+\.\d+$/.test(candidate) || !/^\d+\.\d+\.\d+$/.test(installed))
    return false;
  const release = candidate.slice(1).split('.').map(Number);
  const current = installed.split('.').map(Number);
  for (const [index, value] of release.entries()) {
    if (value !== current[index]) return value > current[index]!;
  }
  return false;
}

interface Check {
  checkedAt: number;
  tag: string | null;
}

async function latestTag(): Promise<string | null> {
  const cached = (await browser.storage.local.get(cacheKey))[cacheKey] as Check | undefined;
  const checkedAt = Date.now();
  if (cached && checkedAt - cached.checkedAt < day) return cached.tag;
  let tag = cached?.tag ?? null;
  try {
    const response = await fetch('https://api.github.com/repos/' + repo + '/releases/latest', {
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      signal: AbortSignal.timeout(4500),
    });
    if (response.ok) {
      const data = (await response.json()) as { tag_name?: unknown };
      if (typeof data.tag_name === 'string' && /^v\d+\.\d+\.\d+$/.test(data.tag_name)) {
        tag = data.tag_name;
      }
    }
  } catch {
    // Retain the last known result when the browser is offline.
  }
  await browser.storage.local.set({ [cacheKey]: { checkedAt, tag } });
  return tag;
}

export async function developerUpdate(): Promise<string | null> {
  if (import.meta.env.VITE_CLIPCARD_DEV_RELEASE !== '1') return null;
  pending ??= latestTag().finally(() => { pending = undefined; });
  const tag = await pending;
  return tag && isNewer(tag, browser.runtime.getManifest().version)
    ? 'https://github.com/' + repo + '/releases/tag/' + tag
    : null;
}
