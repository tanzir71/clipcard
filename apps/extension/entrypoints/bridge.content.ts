import strings from '@clipcard/i18n/en';
import { FLAGS } from '@clipcard/core/flags';
import { browser } from 'wxt/browser';
import { defineContentScript } from 'wxt/utils/define-content-script';
import { forTarget } from '../src/messages.ts';
import { mountClipping } from '../src/clipping.ts';
import { trackPage } from '../src/page-hints.ts';
import {
  dismissToast,
  showCardToast,
  showErrorToast,
  showLinkToast,
} from '../src/toast.ts';

export default defineContentScript({
  matches: ['http://*/*', 'https://*/*'],
  registration: 'runtime',
  main() {
    const isolated = globalThis as typeof globalThis & {
      clipcardBridge?: boolean;
    };
    if (isolated.clipcardBridge) return;
    isolated.clipcardBridge = true;
    const hints = trackPage();
    const clips =
      FLAGS.clips && FLAGS.drafts ? mountClipping(hints) : undefined;
    let closeFrame: (() => void) | undefined;

    function showFrame(
      id?: string,
      share?: boolean,
      collection?: string,
      drafts?: boolean,
    ): Promise<boolean> {
      closeFrame?.();
      dismissToast();
      clips?.popup(true);
      const url = new URL(browser.runtime.getURL('/sheet.html'));
      const extensionOrigin = url.protocol + '//' + url.host;
      if (id) url.searchParams.set('draft', id);
      if (share) url.searchParams.set('share', '1');
      if (collection) url.searchParams.set('collection', collection);
      if (drafts) url.searchParams.set('drafts', '1');
      const host = document.createElement('clipcard-popup');
      host.style.cssText =
        'all:initial;position:fixed;z-index:2147483647;right:12px;top:12px';
      const shadow = host.attachShadow({ mode: 'closed' });
      const frame = document.createElement('iframe');
      frame.title = strings['ext.shortName'];
      frame.src = url.href;
      frame.allow = 'clipboard-write';
      frame.style.cssText =
        'display:block;width:min(392px,calc(100vw - 24px));height:545px;' +
        'max-height:calc(100vh - 24px);border:0;border-radius:6px;background:#fff;' +
        'box-shadow:0 14px 50px #0003,0 2px 5px #0004;color-scheme:light dark';
      const previous = document.activeElement;
      let confirm: (visible: boolean) => void = () => {};
      const shown = new Promise<boolean>((resolve) => {
        confirm = (visible) => {
          clearTimeout(timeout);
          resolve(visible);
        };
      });
      const timeout = setTimeout(() => removeFrame(), 2500);
      shadow.append(frame);
      document.documentElement.append(host);
      closeFrame = removeFrame;
      function removeFrame() {
        window.removeEventListener('message', onFrameMessage);
        window.removeEventListener('keydown', onEscape);
        host.remove();
        clips?.popup(false);
        if (closeFrame === removeFrame) closeFrame = undefined;
        if (previous instanceof HTMLElement)
          previous.focus({ preventScroll: true });
        confirm(false);
      }
      frame.addEventListener('load', () => frame.focus(), { once: true });
      window.addEventListener('message', onFrameMessage);
      window.addEventListener('keydown', onEscape);

      function onEscape(event: KeyboardEvent) {
        if (event.key === 'Escape') closeFrame?.();
      }

      function onFrameMessage(event: MessageEvent) {
        if (
          event.source !== frame.contentWindow ||
          event.origin !== extensionOrigin
        )
          return;
        const signal = event.data as {
          clipcard?: string;
          height?: number;
        } | null;
        if (signal?.clipcard === 'close') closeFrame?.();
        if (
          signal?.clipcard === 'resize' &&
          typeof signal.height === 'number' &&
          Number.isFinite(signal.height)
        ) {
          frame.style.height = Math.max(120, Math.ceil(signal.height)) + 'px';
          if (signal.height > 0) confirm(true);
        }
      }
      return shown;
    }

    browser.runtime.onMessage.addListener(
      (message: unknown, sender, respond) => {
        if (sender.id !== browser.runtime.id || !forTarget(message, 'bridge'))
          return;
        switch (message.kind) {
          case 'hints':
            respond(hints(message.address));
            break;
          case 'open':
            void showFrame(
              message.id,
              message.share,
              message.collection,
              message.drafts,
            ).then(respond, () => respond(false));
            return true;
          case 'startClipping':
            clips?.start();
            respond(Boolean(clips));
            break;
          case 'contextImage':
            respond(clips?.contextImage(message.address));
            break;
          case 'tray':
            clips?.showTray(message.tray);
            respond(Boolean(clips));
            break;
          case 'card':
            void showCardToast(message.card, message.offerPermission).then(() =>
              respond(true),
            );
            return true;
          case 'link':
            void showLinkToast(message.url).then(() => respond(true));
            return true;
          case 'error':
            showErrorToast();
            respond(true);
            break;
        }
      },
    );
  },
});
