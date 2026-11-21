import { cleanBatchLinks, maxBatchLinks, parseWebUrl } from '@clipcard/core';
import { interfaceStrings as strings } from '@clipcard/i18n';
import { browser } from 'wxt/browser';
import type { BackgroundMessage } from './messages.ts';

let active: (() => void) | undefined;

export function selectPageLinks() {
  active?.();
  const host = document.createElement('clipcard-batch-selection');
  host.style.cssText =
    'all:initial;position:fixed;inset:0;z-index:2147483646;cursor:crosshair';
  const shadow = host.attachShadow({ mode: 'closed' });
  const box = document.createElement('div');
  box.style.cssText =
    'position:absolute;background:#a9bcdf22;border:1px dashed #292b35;pointer-events:none';
  box.hidden = true;
  const toolbar = document.createElement('div');
  toolbar.style.cssText =
    'position:absolute;inset-block-start:12px;inset-inline-end:12px;background:#151517;color:#fff;padding:9px 12px;font:13px system-ui;display:flex;gap:12px;align-items:center';
  const status = document.createElement('span');
  status.setAttribute('role', 'status');
  status.textContent = strings['batch.select'];
  const close = document.createElement('button');
  close.type = 'button';
  close.textContent = '×';
  close.title = strings['action.close'];
  close.setAttribute('aria-label', strings['action.close']);
  close.style.cssText =
    'border:1px solid #777;color:#fff;background:transparent;font:15px system-ui;cursor:pointer';
  toolbar.append(status, close);
  shadow.append(box, toolbar);
  document.documentElement.append(host);
  close.focus({ preventScroll: true });

  let pointer: { x: number; y: number; id: number } | undefined;
  let waiting = false;
  function cleanup() {
    document.removeEventListener('keydown', escape, true);
    host.remove();
    if (active === cleanup) active = undefined;
  }
  function escape(event: KeyboardEvent) {
    if (event.key === 'Escape') cleanup();
  }
  active = cleanup;
  document.addEventListener('keydown', escape, true);
  close.onclick = cleanup;

  function bounds(x: number, y: number) {
    const start = pointer ?? { x, y };
    return {
      left: Math.min(start.x, x),
      right: Math.max(start.x, x),
      top: Math.min(start.y, y),
      bottom: Math.max(start.y, y),
    };
  }

  host.addEventListener('pointerdown', (event) => {
    if (event.button || waiting || event.composedPath().includes(toolbar))
      return;
    event.preventDefault();
    pointer = { x: event.clientX, y: event.clientY, id: event.pointerId };
    host.setPointerCapture(event.pointerId);
    box.hidden = false;
    status.textContent = strings['batch.select'];
    Object.assign(box.style, {
      left: pointer.x + 'px',
      top: pointer.y + 'px',
      width: '0',
      height: '0',
    });
  });
  host.addEventListener('pointermove', (event) => {
    if (pointer?.id !== event.pointerId) return;
    const { left, right, top, bottom } = bounds(event.clientX, event.clientY);
    Object.assign(box.style, {
      left: left + 'px',
      top: top + 'px',
      width: right - left + 'px',
      height: bottom - top + 'px',
    });
  });
  host.addEventListener('pointercancel', () => {
    pointer = undefined;
    box.hidden = true;
  });
  host.addEventListener('pointerup', (event) => {
    if (pointer?.id !== event.pointerId) return;
    const area = bounds(event.clientX, event.clientY);
    pointer = undefined;
    const links = cleanBatchLinks(
      Array.from(
        document.querySelectorAll<HTMLAnchorElement>('a[href]'),
      ).flatMap((anchor) => {
        if (
          !(anchor instanceof HTMLAnchorElement) ||
          anchor.closest('nav,footer,[role="navigation"],[aria-hidden="true"]')
        )
          return [];
        const address = anchor.href;
        const title = anchor.innerText.trim().replace(/\s+/g, ' ');
        const rect = anchor.getBoundingClientRect();
        return title.length >= 20 &&
          parseWebUrl(address) &&
          rect.width > 0 &&
          rect.height > 0 &&
          rect.right > area.left &&
          rect.left < area.right &&
          rect.bottom > area.top &&
          rect.top < area.bottom
          ? [{ address, title }]
          : [];
      }),
    );
    if (links.length < 2 || links.length > maxBatchLinks) {
      status.textContent =
        strings[links.length < 2 ? 'batch.empty' : 'batch.limit'];
      return;
    }
    waiting = true;
    status.textContent = strings['batch.loading'];
    const message: BackgroundMessage = {
      to: 'background',
      kind: 'batchLinks',
      links,
      origin: 'selection',
    };
    void browser.runtime
      .sendMessage(message)
      .then((result) => {
        if (result) cleanup();
        else status.textContent = strings['card.renderFailed'];
        waiting = false;
      })
      .catch(() => {
        waiting = false;
        status.textContent = strings['card.renderFailed'];
      });
  });
}
