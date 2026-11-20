import { cleanUrl, parseWebUrl, unwrapUrl } from '@clipcard/core';
import { FLAGS } from '@clipcard/core/flags';
import { interfaceCopy } from '@clipcard/i18n';
import type { InterfaceLanguage, UiStrings } from '@clipcard/i18n';
import {
  sweepDraftCollections,
  updateDraftCollection,
} from '@clipcard/ui/collections';
import { getDraft } from '@clipcard/ui/storage';
import { browser } from 'wxt/browser';
import type { Browser } from 'wxt/browser';
import { bridgeScript, forTarget } from './messages.ts';
import type {
  BackgroundMessage,
  BridgeMessage,
  ClipCapture,
  Destination,
  Hints,
  MadeCard,
  OffscreenMessage,
} from './messages.ts';
import { destinationFor, rememberPrefs, sitePrefs } from './preferences.ts';
import { developerUpdate } from './update-check.ts';
import { persistCapture } from './clip-capture.ts';
import { getUserSettings, watchUserSettings } from './user-settings.ts';

const clipping = FLAGS.clips && FLAGS.drafts;
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
  collection?: string,
  drafts?: boolean,
) {
  const url = new URL(browser.runtime.getURL('/popup-fallback.html'));
  if (id) url.searchParams.set('draft', id);
  if (share) url.searchParams.set('share', '1');
  if (permission) url.searchParams.set('permission', '1');
  if (collection) url.searchParams.set('collection', collection);
  if (drafts) url.searchParams.set('drafts', '1');
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

async function open(
  tab?: Browser.tabs.Tab,
  id?: string,
  share?: boolean,
  collection?: string,
  drafts?: boolean,
) {
  if (tab?.id !== undefined) {
    const shown = await bridge<boolean>(tab.id, 0, {
      to: 'bridge',
      kind: 'open',
      id,
      share,
      collection,
      drafts,
    });
    if (shown) return;
  }
  await fallback(tab, id, share, undefined, collection, drafts);
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
  forceCard = false,
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
    if (forceCard && card.collectionId)
      await updateDraftCollection(card.collectionId, { mode: 'card' });
    await open(tab, card.id, undefined, card.collectionId);
    return;
  }
  const shown = await bridge<boolean>(tab.id, 0, {
    to: 'bridge',
    kind: 'card',
    card,
    offerPermission: !canFetch && card.template === 'solid',
  });
  if (!shown)
    await fallback(tab, card.id, undefined, undefined, card.collectionId);
}

async function findClip(
  tab: Browser.tabs.Tab,
  frameId: number,
  capture: ClipCapture,
) {
  if (tab.id === undefined) return;
  const [hints, canFetch] = await Promise.all([
    readHints(tab.id, frameId),
    capture.image ? mayRead(capture.image) : false,
  ]);
  const tray = await persistCapture(
    tab,
    hints,
    capture,
    canFetch,
    frameId === 0,
  );
  if (tray) await bridge(tab.id, 0, { to: 'bridge', kind: 'tray', tray });
  else await report(tab.id);
  return tray;
}

async function fromMenu(
  info: Browser.contextMenus.OnClickData,
  tab?: Browser.tabs.Tab,
) {
  if (tab?.id === undefined) return;
  const address = info.linkUrl ?? info.frameUrl ?? info.pageUrl ?? tab.url;
  if (!address || !parseWebUrl(address)) return;
  const id = info.menuItemId;
  if (clipping && id === 'startClipping') {
    await bridge(tab.id, 0, { to: 'bridge', kind: 'startClipping' });
    return;
  }
  if (clipping && id === 'clipText') {
    await findClip(tab, info.frameId ?? 0, {
      kind: 'text',
      text: info.selectionText,
    });
    return;
  }
  if (clipping && id === 'clipImage') {
    const capture = await bridge<ClipCapture>(tab.id, info.frameId ?? 0, {
      to: 'bridge',
      kind: 'contextImage',
      address: info.srcUrl,
    });
    await findClip(
      tab,
      info.frameId ?? 0,
      capture ?? { kind: 'image', image: info.srcUrl },
    );
    return;
  }
  if (clipping && id === 'addPage') {
    await showCard(
      tab,
      address,
      await readHints(tab.id, info.frameId, info.linkUrl),
      false,
    );
    return;
  }
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
  if (
    clipping &&
    !hints?.selection &&
    parseWebUrl(hints?.address ?? tab.url ?? '')
  ) {
    await open(tab, undefined, undefined, undefined, true);
    return;
  }
  if (!hints?.source?.isArticle) {
    await open(tab);
    return;
  }
  await showCard(
    tab,
    hints.address,
    hints,
    false,
    clipping ? hints.selection : undefined,
  );
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

let installedMenuLanguage: InterfaceLanguage | undefined;
let menuWork = Promise.resolve();

function refreshMenus(force = false) {
  menuWork = menuWork.catch(() => undefined).then(() => installMenus(force));
  void menuWork.catch(() => undefined);
}

async function installMenus(force: boolean) {
  const language = FLAGS.languages
    ? (await getUserSettings()).interfaceLanguage
    : undefined;
  if (!force && language === installedMenuLanguage) return;
  const copy = language ? interfaceCopy(language) : undefined;
  const localized = (key: Parameters<typeof browser.i18n.getMessage>[0]) =>
    copy?.[key.replace('_', '.') as keyof UiStrings] ??
    browser.i18n.getMessage(key);
  await browser.contextMenus.removeAll();
  const linksAndPages: ['link', 'page'] = ['link', 'page'];
  const selection: ['selection'] = ['selection'];
  browser.contextMenus.create({
    id: 'clipcard',
    title: localized('menu_parent'),
    contexts: clipping
      ? [...linksAndPages, ...selection, 'image']
      : [...linksAndPages, ...selection],
  });
  const items = [
    ['copy', localized('menu_copy'), linksAndPages],
    ['edit', localized('menu_edit'), linksAndPages],
    ['cleanLink', localized('menu_cleanLink'), linksAndPages],
    ['copyQuote', localized('menu_copyQuote'), selection],
    ['editQuote', localized('menu_editQuote'), selection],
  ] as const;
  for (const [id, title, contexts] of items) {
    browser.contextMenus.create({ id, title, contexts, parentId: 'clipcard' });
  }
  if (clipping) {
    browser.contextMenus.create({
      id: 'startClipping',
      title: localized('clip_start'),
      contexts: ['page'],
      parentId: 'clipcard',
    });
    browser.contextMenus.create({
      id: 'clipText',
      title: localized('clip_add'),
      contexts: ['selection'],
      parentId: 'clipcard',
    });
    browser.contextMenus.create({
      id: 'clipImage',
      title: localized('clip_image'),
      contexts: ['image'],
      parentId: 'clipcard',
    });
    browser.contextMenus.create({
      id: 'addPage',
      title: localized('clip_addPage'),
      contexts: linksAndPages,
      parentId: 'clipcard',
    });
  }
  installedMenuLanguage = language;
}

async function handleRequest(
  message: BackgroundMessage,
  sender: Browser.runtime.MessageSender,
) {
  switch (message.kind) {
    case 'captureClip':
      return clipping && sender.tab
        ? findClip(sender.tab, sender.frameId ?? 0, message.capture)
        : null;
    case 'openCollection':
      if (clipping) await open(sender.tab, undefined, undefined, message.id);
      return clipping;
    case 'previewLink':
    case 'copyQuote':
    case 'pageCard':
    case 'addPage': {
      if (!clipping) return null;
      const tab =
        sender.tab ??
        (
          await browser.tabs.query({ active: true, lastFocusedWindow: true })
        )[0];
      if (tab?.id === undefined) return null;
      const address =
        message.kind === 'previewLink' ? message.address : tab.url;
      if (!address || !parseWebUrl(address)) return null;
      const frameId = sender.url?.startsWith(browser.runtime.getURL('/'))
        ? 0
        : sender.frameId;
      await showCard(
        tab,
        address,
        await readHints(
          tab.id,
          frameId,
          message.kind === 'previewLink' ? address : undefined,
        ),
        message.kind === 'previewLink' || message.kind === 'copyQuote',
        message.kind === 'copyQuote' ? message.text : undefined,
        message.kind === 'pageCard',
      );
      return true;
    }
    case 'open':
      if (clipping && message.collection) {
        await updateDraftCollection(message.collection, { mode: 'card' });
      }
      await open(sender.tab, message.id, message.share, message.collection);
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

async function syncClippingEntryPoints() {
  const id = 'clipcard-clipping';
  const { origins } = await browser.permissions.getAll();
  const matches = (origins ?? []).filter(
    (origin) => origin === '<all_urls>' || /^(\*|https?):\/\//.test(origin),
  );
  const [existing] = await browser.scripting.getRegisteredContentScripts({
    ids: [id],
  });
  if (!matches.length) {
    if (existing)
      await browser.scripting.unregisterContentScripts({ ids: [id] });
    return;
  }
  const script = {
    id,
    matches,
    js: [bridgeScript.slice(1)],
    allFrames: true,
  } as const;
  if (existing)
    await browser.scripting.updateContentScripts([
      { ...script, js: [...script.js] },
    ]);
  else
    await browser.scripting.registerContentScripts([
      { ...script, js: [...script.js] },
    ]);
}

export function startExtension() {
  if (FLAGS.languages) watchUserSettings(() => refreshMenus());
  if (clipping) {
    function updateEntryPoints() {
      void syncClippingEntryPoints().catch(() => undefined);
    }
    browser.permissions.onAdded.addListener(updateEntryPoints);
    browser.permissions.onRemoved.addListener(updateEntryPoints);
    updateEntryPoints();
  }
  browser.runtime.onInstalled.addListener(({ reason }) => {
    if (FLAGS.languages && reason === 'install') {
      void browser.tabs
        .create({ url: browser.runtime.getURL('/welcome.html') })
        .catch(() => undefined);
    }
    refreshMenus(true);
    void browser.action.setBadgeBackgroundColor({ color: '#187451' });
    void developerUpdate().catch(() => undefined);
  });
  browser.runtime.onStartup.addListener(() => {
    void developerUpdate().catch(() => undefined);
    if (clipping) void sweepDraftCollections().catch(() => undefined);
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
    if (clipping && command === 'clip-selection' && tab?.id !== undefined) {
      void bridge(tab.id, 0, { to: 'bridge', kind: 'startClipping' }).catch(
        () => report(tab.id),
      );
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
