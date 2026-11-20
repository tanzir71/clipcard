import {
  activeInterfaceLanguage,
  interfaceStrings as strings,
} from '@clipcard/i18n';
import { dirFor } from '@clipcard/core';
import { FLAGS } from '@clipcard/core/flags';
import { browser } from 'wxt/browser';
import type { BackgroundMessage, MadeCard } from './messages.ts';
import css from './toast.css?inline';

let active: HTMLElement | null = null;

export function dismissToast() {
  active?.remove();
  active = null;
}

function toast(direction: 'ltr' | 'rtl') {
  dismissToast();
  const host = document.createElement('clipcard-toast');
  host.dir = FLAGS.languages ? dirFor(activeInterfaceLanguage) : direction;
  if (FLAGS.languages) host.lang = activeInterfaceLanguage;
  const shadow = host.attachShadow({ mode: 'closed' });
  const style = new CSSStyleSheet();
  style.replaceSync(css);
  shadow.adoptedStyleSheets = [style];
  const panel = document.createElement('section');
  panel.className = 'toast';
  panel.setAttribute('aria-label', strings['ext.shortName']);
  const message = document.createElement('div');
  message.className = 'message';
  const status = document.createElement('div');
  status.className = 'status';
  status.setAttribute('aria-hidden', 'true');
  const live = document.createElement('span');
  live.className = 'sr-only';
  live.setAttribute('role', 'status');
  live.setAttribute('aria-live', 'polite');
  message.append(status, live);
  panel.append(message, control(strings['action.dismiss'], dismissToast, '×'));
  shadow.append(panel);
  document.documentElement.append(host);
  active = host;

  function announce(label: string, accessibleLabel = label) {
    status.textContent = label;
    live.textContent = accessibleLabel;
  }

  function startTimer() {
    if (panel.querySelector('.progress')) return;
    const bar = document.createElement('div');
    bar.className = 'progress';
    bar.setAttribute('aria-hidden', 'true');
    bar.addEventListener(
      'animationend',
      () => {
        if (active === host) dismissToast();
      },
      { once: true },
    );
    panel.append(bar);
  }

  return { host, panel, message, status, announce, startTimer };
}

function control(label: string, action: () => void, symbol?: string) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = symbol ? 'icon' : 'text';
  button.textContent = symbol ?? label;
  button.setAttribute('aria-label', label);
  button.title = label;
  button.addEventListener('click', action);
  return button;
}

function send(message: BackgroundMessage) {
  void browser.runtime.sendMessage(message).catch(() => undefined);
}

function dataImage(address: string, type: string) {
  const binary = atob(address.slice(address.indexOf(',') + 1));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type });
}

async function copyImage(address: string) {
  const png = dataImage(address, 'image/png');
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
}

async function drawThumb(canvas: HTMLCanvasElement, address: string) {
  const image = await createImageBitmap(dataImage(address, 'image/webp'));
  try {
    canvas
      .getContext('2d')
      ?.drawImage(image, 0, 0, canvas.width, canvas.height);
  } finally {
    image.close();
  }
}

export async function showCardToast(card: MadeCard, offerPermission: boolean) {
  const { png, thumb, url, dir, id } = card;
  const view = toast(dir);
  if (thumb) {
    const canvas = document.createElement('canvas');
    canvas.className = 'thumb';
    canvas.width = 120;
    canvas.height = 150;
    canvas.setAttribute('aria-hidden', 'true');
    view.panel.prepend(canvas);
    void drawThumb(canvas, thumb).catch(() => canvas.remove());
  }
  if (offerPermission) {
    view.message.append(
      control(strings['toast.allowPhotos'], () =>
        send({
          to: 'background',
          kind: 'allowPhotos',
        }),
      ),
    );
  }
  const dismiss = view.panel.lastElementChild;
  view.panel.insertBefore(
    control(
      strings['action.share'],
      () =>
        send({
          to: 'background',
          kind: 'open',
          id,
          collection: card.collectionId,
          share: true,
        }),
      '↗',
    ),
    dismiss,
  );
  view.panel.insertBefore(
    control(
      strings['action.edit'],
      () =>
        send({
          to: 'background',
          kind: 'open',
          id,
          collection: card.collectionId,
        }),
      '✎',
    ),
    dismiss,
  );

  let retry: HTMLButtonElement | undefined;
  const copy = async () => {
    if (!png) return;
    try {
      await copyImage(png);
      if (!view.host.isConnected) return;
      retry?.remove();
      view.status.dataset.copied = '';
      view.announce(strings['toast.copied'], strings['a11y.copied']);
      const comment = control(strings['action.copyLinkForComment'], () => {
        void navigator.clipboard.writeText(url).then(
          () => view.announce(strings['toast.linkCopied']),
          () => view.announce(strings['card.copyFailed']),
        );
      });
      view.message.append(comment);
      view.startTimer();
    } catch {
      view.announce(strings['card.copyFailed']);
      retry ??= control(strings['toast.copyFallback'], () => void copy());
      view.message.append(retry);
    }
  };
  await copy();
}

export async function showLinkToast(url: string) {
  const view = toast(document.documentElement.dir === 'rtl' ? 'rtl' : 'ltr');
  let retry: HTMLButtonElement | undefined;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      retry?.remove();
      view.announce(strings['toast.linkCopied']);
      view.startTimer();
    } catch {
      view.announce(strings['card.copyFailed']);
      retry ??= control(strings['toast.copyFallback'], () => void copy());
      view.message.append(retry);
    }
  };
  await copy();
}

export function showErrorToast() {
  const view = toast(document.documentElement.dir === 'rtl' ? 'rtl' : 'ltr');
  view.announce(strings['card.renderFailed']);
  view.startTimer();
}
