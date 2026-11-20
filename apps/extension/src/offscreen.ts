import { browser } from 'wxt/browser';
import { makeCard, sourceAddress } from './make-card.ts';
import { forTarget } from './messages.ts';
import type { BackgroundMessage, SitePrefs } from './messages.ts';

let active = 0;
let idle: ReturnType<typeof setTimeout> | undefined;
function scheduleIdle() {
  if (active) return;
  clearTimeout(idle);
  idle = setTimeout(() => {
    const message: BackgroundMessage = {
      to: 'background',
      kind: 'offscreenIdle',
    };
    void browser.runtime.sendMessage(message).catch(() => undefined);
  }, 60_000);
}

scheduleIdle();

async function preferencesFor(address: string): Promise<SitePrefs> {
  const message: BackgroundMessage = {
    to: 'background',
    kind: 'sitePrefs',
    address,
  };
  const prefs = (await browser.runtime.sendMessage(
    message,
  )) as SitePrefs | null;
  return prefs ?? {};
}

browser.runtime.onMessage.addListener((message: unknown, sender, respond) => {
  if (sender.id !== browser.runtime.id || !forTarget(message, 'offscreen'))
    return;
  active++;
  clearTimeout(idle);
  const work =
    message.kind === 'resolve'
      ? sourceAddress(message.address, true)
      : makeCard(message.source, message.render, preferencesFor);
  void work
    .then(respond, () => respond(null))
    .finally(() => {
      active--;
      scheduleIdle();
    });
  return true;
});
