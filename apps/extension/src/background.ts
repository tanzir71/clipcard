import { cleanUrl, parseWebUrl, unwrapUrl } from '@clipcard/core';
import { getDraft } from '@clipcard/ui/storage';
import { browser } from 'wxt/browser';
import type { Browser } from 'wxt/browser';
import { bridgeScript, forTarget } from './messages.ts';
import type {
  BackgroundMessage,
  BridgeMessage,
  Destination,
  Hints,
  MadeCard,
  OffscreenMessage,
} from './messages.ts';
import { destinationFor, rememberPrefs, sitePrefs } from './preferences.ts';
import { developerUpdate } from './update-check.ts';

const offscreenPath = '/offscreen.html';
const destinationKey = 'lastShareDestination';
let opening: Promise<void> | undefined;
let closing: Promise<void> | undefined;
let offscreenRequests = 0;
let lastDestination: Destination | undefined;

function hasHostPermission(url: URL) {
  return browser.permissions
    .contains({
      origins: [url.protocol + '//' + url.hostname + '/*'],
    })
    .catch(() => false);
}

async function mayRead(address: string) {
  const url = parseWebUrl(address);
  return url ? hasHostPermission(new URL(unwrapUrl(url.href))) : false;
}

async function createOffscreen() {
  if (closing) await closing;
  const contexts = await browser.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [browser.runtime.getURL(offscreenPath)],
  });
  if (contexts.length) return;
  await browser.offscreen.createDocument({
    url: offscreenPath,
    reasons: ['DOM_PARSER', 'BLOBS'],
    justification: browser.i18n.getMessage('permission_offscreen'),
  });
}

async function offscreen<T>(message: OffscreenMessage): Promise<T | null> {
  offscreenRequests++;
  try {
    opening ??= createOffscreen().finally(() => {
      opening = undefined;
    });
    await opening;
    return (await browser.runtime.sendMessage(message)) as T | null;
  } finally {
    offscreenRequests--;
  }
}

async function closeIdleOffscreen() {
  if (offscreenRequests || closing) return;
  closing = browser.offscreen.closeDocument().finally(() => {
    closing = undefined;
  });
  await closing;
}

async function sendBridge<T>(
  tabId: number,
  frameId: number,
  message: BridgeMessage,
) {
  return (await browser.tabs.sendMessage(tabId, message, { frameId })) as T;
}

async function bridge<T>(
  tabId: number,
  frameId: number,
  message: BridgeMessage,
): Promise<T | null> {
  try {
    return await sendBridge<T>(tabId, frameId, message);
  } catch {
    try {
      await browser.scripting.executeScript({
        target: { tabId, frameIds: [frameId] },
        files: [bridgeScript],
      });
      return await sendBridge<T>(tabId, frameId, message);
    } catch {
      return null;
    }
  }
}

function readHints(tabId: number, frameId = 0, address?: string) {
  return bridge<Hints>(tabId, frameId, {
    to: 'bridge',
    kind: 'hints',
    address,
  });
}

async function setBadge(tabId: number, isArticle: boolean) {
  await browser.action.setBadgeText({ tabId, text: isArticle ? '•' : '' });
}

async function refreshArticleBadge(tabId: number, address?: string) {
  const page = parseWebUrl(address ?? '');
  if (!page || !(await hasHostPermission(page))) return;
  const hints = await readHints(tabId);
  if (hints?.address !== page.href) return;
  const current = await browser.tabs.get(tabId);
  if (current.url === page.href) {
    await setBadge(tabId, hints.source?.isArticle === true);
  }
}

async function fallback(
  tab?: Browser.tabs.Tab,
  id?: string,
  share?: boolean,
  permission?: boolean,
) {
  const url = new URL(browser.runtime.getURL('/popup-fallback.html'));
  if (id) url.searchParams.set('draft', id);
  if (share) url.searchParams.set('share', '1');
  if (permission) url.searchParams.set('permission', '1');
  const parent = tab
    ? await browser.windows.get(tab.windowId).catch(() => null)
    : null;
  const width = 416;
  const height = Math.max(200, Math.min(650, (parent?.height ?? 680) - 44));
  try {
    await browser.windows.create({
      url: url.href,
      type: 'popup',
      width,
      height,
      focused: true,
      top: (parent?.top ?? 0) + 44,
      left:
        (parent?.left ?? 0) +
        Math.max(0, (parent?.width ?? width + 12) - width - 12),
    });
  } catch {
    // The parent window may extend beyond a display's usable bounds.
    url.searchParams.set('fit', '1');
    await browser.windows.create({
      url: url.href,
      type: 'popup',
      focused: true,
    });
  }
}

async function open(tab?: Browser.tabs.Tab, id?: string, share?: boolean) {
  if (tab?.id !== undefined) {
    const shown = await bridge<boolean>(tab.id, 0, {
      to: 'bridge',
      kind: 'open',
      id,
      share,
    });
    if (shown) return;
  }
  await fallback(tab, id, share);
}

async function make(
  address: string,
  hints: Hints | null,
  render: boolean,
  canFetch: boolean,
  selection?: string,
) {
  if (!parseWebUrl(address)) return null;
  lastDestination ??= (await browser.storage.session.get(destinationKey))[
    destinationKey
  ] as Destination | undefined;
  return offscreen<MadeCard>({
    to: 'offscreen',
    kind: 'make',
    source: {
      address,
      hints,
      canFetch,
      selection,
      destination: lastDestination ?? destinationFor(hints?.referrer ?? ''),
    },
    render,
  });
}

async function showCard(
  tab: Browser.tabs.Tab,
  address: string,
  hints: Hints | null,
  render: boolean,
  selection?: string,
) {
  if (tab.id === undefined) return;
  const canFetch = await mayRead(address);
  const card = await make(address, hints, render, canFetch, selection);
  if (!card) {
    if (render) await bridge(tab.id, 0, { to: 'bridge', kind: 'error' });
    else await open(tab);
    return;
  }
  if (!render) {
    await open(tab, card.id);
    return;
  }
  const shown = await bridge<boolean>(tab.id, 0, {
    to: 'bridge',
    kind: 'card',
    card,
    offerPermission: !canFetch && card.template === 'solid',
  });
  if (!shown) await fallback(tab, card.id);
}

async function fromMenu(
  info: Browser.contextMenus.OnClickData,
  tab?: Browser.tabs.Tab,
) {
  if (tab?.id === undefined) return;
  const address = info.linkUrl ?? info.frameUrl ?? info.pageUrl ?? tab.url;
  if (!address || !parseWebUrl(address)) return;
  if (info.menuItemId === 'cleanLink') {
    const canFetch = await mayRead(address);
    const resolved = canFetch
      ? await offscreen<string>({ to: 'offscreen', kind: 'resolve', address })
      : null;
    const url = resolved ?? cleanUrl(unwrapUrl(address)).url;
    await bridge(tab.id, 0, { to: 'bridge', kind: 'link', url });
    return;
  }

  const hints = await readHints(tab.id, info.frameId, info.linkUrl);
  if (hints?.source) await setBadge(tab.id, hints.source.isArticle);
  const id = info.menuItemId;
  const selection =
    id === 'copyQuote' || id === 'editQuote' ? info.selectionText : undefined;
  await showCard(
    tab,
    address,
    hints,
    id === 'copy' || id === 'copyQuote',
    selection,
  );
}

async function fromToolbar(tab: Browser.tabs.Tab) {
  if (tab.id === undefined) return;
  const hints = await readHints(tab.id);
  await setBadge(tab.id, Boolean(hints?.source?.isArticle));
  if (!hints?.source?.isArticle) {
    await open(tab);
    return;
  }
  await showCard(tab, hints.address, hints, false);
}

async function fromShortcut(tab: Browser.tabs.Tab) {
  if (tab.id === undefined) return;
  const hints = await readHints(tab.id);
  if (!hints?.address) {
    await open(tab);
    return;
  }
  if (hints.source) await setBadge(tab.id, hints.source.isArticle);
  if (hints.hoveredLink) {
    const preview = await readHints(tab.id, 0, hints.hoveredLink);
    await showCard(tab, hints.hoveredLink, preview, true);
  } else {
    await showCard(tab, hints.address, hints, true, hints.selection);
  }
}

async function installMenus() {
  await browser.contextMenus.removeAll();
  const linksAndPages: ['link', 'page'] = ['link', 'page'];
  const selection: ['selection'] = ['selection'];
  browser.contextMenus.create({
    id: 'clipcard',
    title: browser.i18n.getMessage('menu_parent'),
    contexts: [...linksAndPages, ...selection],
  });
  const items = [
    ['copy', browser.i18n.getMessage('menu_copy'), linksAndPages],
    ['edit', browser.i18n.getMessage('menu_edit'), linksAndPages],
    ['cleanLink', browser.i18n.getMessage('menu_cleanLink'), linksAndPages],
    ['copyQuote', browser.i18n.getMessage('menu_copyQuote'), selection],
    ['editQuote', browser.i18n.getMessage('menu_editQuote'), selection],
  ] as const;
  for (const [id, title, contexts] of items) {
    browser.contextMenus.create({ id, title, contexts, parentId: 'clipcard' });
  }
}

async function handleRequest(
  message: BackgroundMessage,
  sender: Browser.runtime.MessageSender,
) {
  switch (message.kind) {
    case 'open':
      await open(sender.tab, message.id, message.share);
      return true;
    case 'allowPhotos':
      await fallback(sender.tab, undefined, undefined, true);
      return true;
    case 'paste':
      return make(message.address, null, false, await mayRead(message.address));
    case 'remember': {
      const draft = await getDraft(message.id);
      if (draft) await rememberPrefs(draft);
      return true;
    }
    case 'sitePrefs':
      return sender.url === browser.runtime.getURL(offscreenPath)
        ? sitePrefs(message.address)
        : {};
    case 'releaseUpdate':
      return developerUpdate();
    case 'offscreenIdle':
      if (sender.url === browser.runtime.getURL(offscreenPath)) {
        await closeIdleOffscreen();
      }
      return true;
  }
}

async function report(tabId?: number) {
  if (tabId !== undefined)
    await bridge(tabId, 0, { to: 'bridge', kind: 'error' });
}

export function startExtension() {
  browser.runtime.onInstalled.addListener(() => {
    void installMenus().catch(() => undefined);
    void browser.action.setBadgeBackgroundColor({ color: '#187451' });
    void developerUpdate().catch(() => undefined);
  });
  browser.runtime.onStartup.addListener(() => {
    void developerUpdate().catch(() => undefined);
  });
  browser.contextMenus.onClicked.addListener((info, tab) => {
    void fromMenu(info, tab).catch(() => report(tab?.id));
  });
  browser.action.onClicked.addListener((tab) => {
    void fromToolbar(tab).catch(() => report(tab.id));
  });
  browser.commands.onCommand.addListener((command, tab) => {
    if (command === 'copy-clipcard' && tab) {
      void fromShortcut(tab).catch(() => report(tab.id));
    }
  });
  browser.tabs.onActivated.addListener(({ tabId }) => {
    void browser.tabs
      .get(tabId)
      .then(async (tab) => {
        void refreshArticleBadge(tabId, tab.url).catch(() => undefined);
        const destination = destinationFor(tab.url ?? '');
        if (destination) {
          lastDestination = destination;
          await browser.storage.session.set({ [destinationKey]: destination });
        }
      })
      .catch(() => undefined);
  });
  browser.tabs.onUpdated.addListener((tabId, change, tab) => {
    if (change.status === 'loading') {
      void setBadge(tabId, false).catch(() => undefined);
    } else if (change.status === 'complete' && tab.active) {
      void refreshArticleBadge(tabId, tab.url).catch(() => undefined);
    }
  });
  browser.runtime.onMessage.addListener((message: unknown, sender, respond) => {
    if (sender.id !== browser.runtime.id || !forTarget(message, 'background'))
      return;
    void handleRequest(message, sender).then(respond, () => respond(null));
    return true;
  });
}
