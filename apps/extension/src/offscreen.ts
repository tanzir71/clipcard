import { browser } from 'wxt/browser';
import { createBatch } from '@clipcard/ui/batch';
import { makeCard, makeDraft, sourceAddress } from './make-card.ts';
import { forTarget } from './messages.ts';
import type {
  BackgroundMessage,
  OffscreenMessage,
  SitePrefs,
} from './messages.ts';

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

async function makeBatch(
  message: Extract<OffscreenMessage, { kind: 'makeBatch' }>,
) {
  const cards = [];
  for (let offset = 0; offset < message.sources.length; offset += 4) {
    cards.push(
      ...(await Promise.all(
        message.sources
          .slice(offset, offset + 4)
          .map((source) => makeDraft(source, preferencesFor)),
      )),
    );
  }
  return (await createBatch(cards, message.origin, message.title))?.draft.id;
}

browser.runtime.onMessage.addListener((message: unknown, sender, respond) => {
  if (sender.id !== browser.runtime.id || !forTarget(message, 'offscreen'))
    return;
  active++;
  clearTimeout(idle);
  const work =
    message.kind === 'makeBatch'
      ? makeBatch(message)
      : message.kind === 'resolve'
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
