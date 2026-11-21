import { FLAGS } from '@clipcard/core/flags';
import { dirFor, parseWebUrl, textFragment } from '@clipcard/core';
import { interfaceStrings as strings } from '@clipcard/i18n';
import type { UiStrings } from '@clipcard/i18n';
import type { UserSettings } from './user-settings.ts';
import { browser } from 'wxt/browser';
import type {
  BackgroundMessage,
  ClipCapture,
  ClipTray,
  Hints,
} from './messages.ts';

const selector =
  'img,svg,canvas,table,figure,blockquote,p,h1,h2,h3,h4,a,section';
const send = (message: BackgroundMessage) =>
  browser.runtime.sendMessage(message);

function rectFor(box: { x: number; y: number; width: number; height: number }) {
  return {
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height,
    viewport: window.innerWidth,
  };
}

function captureFor(element: Element): ClipCapture {
  if (element instanceof HTMLImageElement) {
    return {
      kind: 'image',
      image: parseWebUrl(element.currentSrc || element.src)?.href,
      rect: rectFor(element.getBoundingClientRect()),
    };
  }
  if (element.matches('blockquote,p,h1,h2,h3,h4,a')) {
    return {
      kind: 'text',
      text:
        element instanceof HTMLElement ? element.innerText.trim() : undefined,
    };
  }
  return { kind: 'section', rect: rectFor(element.getBoundingClientRect()) };
}

export function mountClipping(readHints: () => Hints) {
  const root = document.createElement('clipcard-clipping');
  const shadow = root.attachShadow({ mode: 'closed' });
  const style = document.createElement('style');
  style.textContent = `
    :host{all:initial;color-scheme:light}
    .clip{position:fixed;z-index:2147483646;font:500 13px system-ui,sans-serif}
    .panel{inset:12px 12px auto auto;display:grid;justify-items:end;gap:8px;max-width:calc(100vw - 24px)}
    .bar{display:flex;align-items:center;gap:8px;padding:6px;border-radius:5px;color:#fff;background:#0b0b0c;box-shadow:0 8px 28px #0004}
    .tiles button.tile{position:relative;min-width:40px;padding:0}.tiles button.tile img{position:absolute;inset:0;z-index:-1}.tiles button.tile:disabled{opacity:.55}.tray{padding:10px;gap:12px}.tray em{font:inherit;color:#bbb}
    .tiles{display:flex;padding-inline-start:2px}
    .tile{display:grid;width:40px;height:52px;place-items:center;margin-inline-start:-10px;background:#14243d;color:#a9bcdf;box-shadow:0 0 0 1px #0b0b0c;font:700 24px Georgia,serif}
    .tile:first-child{margin-inline-start:0}
    .tile img{display:block;width:40px;height:52px;object-fit:cover}
    button{min-height:30px;padding:4px 9px;border:0;border-radius:3px;background:#fff;color:#0b0b0c;font:600 13px system-ui,sans-serif;cursor:pointer}
    button.quiet{background:#2c2c2e;color:#fff}
    button:focus-visible{outline:2px solid #a9bcdf;outline-offset:2px}
    .outline{outline:2px solid #0b0b0c;background:#0b0b0c0a;box-sizing:border-box;pointer-events:none}
    .outline span,.mark{position:absolute;inset:0 0 auto auto;background:#0b0b0c;color:#fff;padding:3px 8px}
    .float{max-width:calc(100vw - 16px)}
    [hidden]{display:none!important}
  `;
  const panel = document.createElement('div');
  panel.className = 'clip panel';
  const tray = document.createElement('div');
  tray.className = 'bar tray';
  const pill = document.createElement('div');
  pill.className = 'bar';
  const status = document.createElement('span');
  status.textContent = '▪ ' + strings['clip.active'];
  const outline = document.createElement('div');
  outline.className = 'clip outline';
  const tag = document.createElement('span');
  outline.append(tag);
  const selectionTools = document.createElement('div');
  selectionTools.className = 'clip bar float';
  const previewTools = document.createElement('div');
  previewTools.className = 'clip bar float';
  panel.append(tray, pill);
  shadow.append(style, panel, outline, selectionTools, previewTools);
  document.documentElement.append(root);

  let clipping = false;
  let popupOpen = false;
  let working = false;
  let current: ClipTray | undefined;
  let lastContext: Element | null = null;
  let candidate: Element | null = null;
  let anchor: { x: number; y: number } | undefined;
  let hoveredAddress: string | undefined;
  let linkButtons: UserSettings['links'] = 'previews';
  let selectionToolbar = true;
  let language: UserSettings['interfaceLanguage'] = 'en';
  let selected = '';
  const clipped = new WeakSet<Element>();
  const labels: Array<{
    button: HTMLButtonElement;
    key: keyof UiStrings;
    prefix: string;
  }> = [];

  function button(label: string, action: () => void, quiet = false) {
    const node = document.createElement('button');
    node.type = 'button';
    node.textContent = label;
    node.className = quiet ? 'quiet' : '';
    node.addEventListener('pointerdown', (event) => event.preventDefault());
    node.addEventListener('click', action);
    return node;
  }

  function localizedButton(
    key: keyof UiStrings,
    action: () => void,
    quiet = false,
    prefix = '',
  ) {
    const control = button(prefix + strings[key], action, quiet);
    labels.push({ button: control, key, prefix });
    return control;
  }

  function sync() {
    panel.hidden = popupOpen || working;
    outline.hidden = !clipping || popupOpen || working || !candidate;
    pill.hidden = !clipping;
    tray.hidden = !current || !current.count;
    if (clipping || popupOpen || working) {
      selectionTools.hidden = true;
      previewTools.hidden = true;
    }
  }

  function done() {
    clipping = false;
    candidate = null;
    anchor = undefined;
    sync();
  }
  pill.append(status, localizedButton('clip.done', done));
  function start() {
    clipping = true;
    sync();
  }

  function showTray(summary: ClipTray) {
    current = summary;
    const title = document.createElement('span');
    title.textContent = strings['clip.count'].replace(
      '{count}',
      String(summary.count),
    );
    const sources = document.createElement('em');
    sources.textContent = strings['clip.sources'].replace(
      '{count}',
      String(summary.sources),
    );
    const caption = document.createElement('div');
    caption.append(title, document.createElement('br'), sources);
    const tiles = document.createElement('div');
    tiles.className = 'tiles';
    if (!FLAGS.videoJoin) tiles.setAttribute('aria-hidden', 'true');
    for (const item of summary.thumbnails) {
      const tile =
        FLAGS.videoJoin && item.id
          ? button(
              '☆',
              () => {
                const action = tile as HTMLButtonElement;
                action.disabled = true;
                void send({
                  to: 'background',
                  kind: 'saveLibraryClip',
                  draftId: summary.id,
                  clipId: item.id!,
                })
                  .then((saved) => {
                    action.disabled = Boolean(saved);
                    if (saved)
                      action.setAttribute('aria-label', strings['card.saved']);
                  })
                  .catch(() => {
                    action.disabled = false;
                  });
              },
              true,
            )
          : document.createElement('div');
      if (tile instanceof HTMLButtonElement) {
        tile.setAttribute('aria-label', strings['library.save']);
        tile.title = strings['library.save'];
      }
      tile.className = 'tile';
      if (item.image) {
        const image = document.createElement('img');
        image.src = item.image;
        image.alt = '';
        tile.append(image);
      } else {
        tile.textContent = item.kind === 'text' ? '“' : '↗';
      }
      tiles.append(tile);
    }
    const close = button(
      '×',
      () => {
        current = undefined;
        sync();
      },
      true,
    );
    close.title = strings['action.close'];
    close.setAttribute('aria-label', strings['action.close']);
    tray.replaceChildren(
      tiles,
      caption,
      button(strings['card.makeCard'], () => {
        void send({ to: 'background', kind: 'openCollection', id: summary.id });
      }),
      close,
    );
    sync();
  }

  function target(event: Event) {
    return event.target instanceof Element && event.target !== root
      ? event.target.closest(selector)
      : null;
  }

  function paint(
    box: { x: number; y: number; width: number; height: number },
    label: string,
  ) {
    Object.assign(outline.style, {
      left: box.x + 'px',
      top: box.y + 'px',
      width: box.width + 'px',
      height: box.height + 'px',
    });
    tag.textContent = label;
    outline.hidden = popupOpen || working;
  }

  async function capture(input: ClipCapture, element?: Element | null) {
    if (working) return;
    working = true;
    sync();
    try {
      if (input.rect)
        await new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        );
      const info = (await send({
        to: 'background',
        kind: 'captureClip',
        capture: input,
      })) as ClipTray | undefined;
      if (info?.count) {
        if (element) clipped.add(element);
        showTray(info);
      }
    } finally {
      working = false;
      sync();
    }
  }

  document.addEventListener(
    'contextmenu',
    (event) => {
      lastContext = target(event);
    },
    true,
  );
  document.addEventListener(
    'pointermove',
    (event) => {
      if (!clipping || popupOpen || working || event.target === root) return;
      const next = target(event);
      candidate = next;
      if (anchor) {
        paint(
          {
            x: Math.min(anchor.x, event.clientX),
            y: Math.min(anchor.y, event.clientY),
            width: Math.abs(event.clientX - anchor.x),
            height: Math.abs(event.clientY - anchor.y),
          },
          '+ ' + strings['clip.kind.section'],
        );
      } else if (next) {
        const kind = captureFor(next).kind;
        paint(
          next.getBoundingClientRect(),
          clipped.has(next) ? '✓' : '+ ' + strings[`clip.kind.${kind}`],
        );
      } else sync();
    },
    true,
  );
  document.addEventListener(
    'pointerdown',
    (event) => {
      if (!clipping || popupOpen || event.button !== 0 || event.target === root)
        return;
      anchor = { x: event.clientX, y: event.clientY };
      event.preventDefault();
    },
    true,
  );
  document.addEventListener(
    'pointerup',
    (event) => {
      const point = anchor;
      anchor = undefined;
      if (!point || popupOpen || event.target === root) return;
      const width = Math.abs(point.x - event.clientX);
      const height = Math.abs(point.y - event.clientY);
      if (width >= 12 && height >= 12) {
        void capture({
          kind: 'section',
          rect: rectFor({
            x: Math.min(point.x, event.clientX),
            y: Math.min(point.y, event.clientY),
            width,
            height,
          }),
        });
      } else {
        const item = target(event);
        if (item) void capture(captureFor(item), item);
      }
      event.preventDefault();
    },
    true,
  );
  document.addEventListener(
    'click',
    (event) => {
      if (!clipping || popupOpen || event.target === root) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    },
    true,
  );
  document.addEventListener(
    'keydown',
    (event) => {
      if (clipping && event.key === 'Escape') {
        done();
        event.stopImmediatePropagation();
      } else if (clipping && event.key === 'Enter' && event.target !== root) {
        const item = target(event);
        if (item) {
          event.preventDefault();
          void capture(captureFor(item), item);
        }
      }
    },
    true,
  );

  document.addEventListener('selectionchange', () => {
    if (!selectionToolbar || popupOpen || clipping || working) return;
    const selection = window.getSelection();
    selected = selection?.toString().trim() ?? '';
    const node = selection?.anchorNode?.parentElement;
    if (
      !selected ||
      !selection?.rangeCount ||
      node?.closest('input, textarea, [contenteditable]')
    ) {
      selectionTools.hidden = true;
      return;
    }
    const box = selection.getRangeAt(0).getBoundingClientRect();
    selectionTools.hidden = false;
    selectionTools.style.top =
      Math.max(8, box.top - selectionTools.offsetHeight - 8) + 'px';
    selectionTools.style.left =
      Math.max(
        8,
        Math.min(
          box.left + (box.width - selectionTools.offsetWidth) / 2,
          window.innerWidth - selectionTools.offsetWidth - 8,
        ),
      ) + 'px';
  });
  selectionTools.append(
    localizedButton(
      'clip.quoteCard',
      () => void send({ to: 'background', kind: 'copyQuote', text: selected }),
      true,
    ),
    localizedButton(
      'clip.add',
      () => void capture({ kind: 'text', text: selected }),
      false,
      '+ ',
    ),
    localizedButton(
      'clip.copyWithLink',
      () => {
        const hints = readHints();
        const address = hints.source?.canonicalUrl ?? hints.address;
        if (parseWebUrl(address))
          void navigator.clipboard.writeText(
            selected + '\n' + textFragment(address, selected),
          );
      },
      true,
    ),
  );

  document.addEventListener(
    'pointerover',
    (event) => {
      if (
        linkButtons === 'off' ||
        popupOpen ||
        clipping ||
        working ||
        event.target === root
      )
        return;
      const link =
        event.target instanceof Element
          ? event.target.closest<HTMLAnchorElement>('a[href]')
          : null;
      const bounds = link?.getBoundingClientRect();
      hoveredAddress =
        link &&
        bounds &&
        (linkButtons === 'all' ||
          (bounds.width >= 96 &&
            bounds.height >= 48 &&
            link.querySelector('img')))
          ? parseWebUrl(link.href)?.href
          : undefined;
      previewTools.hidden = !hoveredAddress;
      if (bounds && hoveredAddress) {
        previewTools.style.top = Math.max(8, bounds.top + 6) + 'px';
        previewTools.style.left =
          Math.max(
            8,
            Math.min(bounds.right, window.innerWidth) -
              previewTools.offsetWidth -
              6,
          ) + 'px';
      }
    },
    true,
  );
  previewTools.append(
    localizedButton('card.makeCard', () => {
      if (hoveredAddress)
        void send({
          to: 'background',
          kind: 'previewLink',
          address: hoveredAddress,
        });
    }),
  );
  document.addEventListener(
    'scroll',
    () => {
      selectionTools.hidden = true;
      previewTools.hidden = true;
      outline.hidden = true;
    },
    { capture: true, passive: true },
  );
  selectionTools.hidden = true;
  previewTools.hidden = true;
  sync();

  return {
    start,
    showTray,
    configure(
      settings: Pick<
        UserSettings,
        'links' | 'selectionToolbar' | 'interfaceLanguage'
      >,
    ) {
      if (language !== settings.interfaceLanguage) {
        language = settings.interfaceLanguage;
        root.lang = language;
        root.dir = dirFor(language);
        status.textContent = '▪ ' + strings['clip.active'];
        for (const label of labels)
          label.button.textContent = label.prefix + strings[label.key];
        if (current) showTray(current);
      }
      if (linkButtons !== settings.links) {
        linkButtons = settings.links;
        hoveredAddress = undefined;
        previewTools.hidden = true;
      }
      selectionToolbar = settings.selectionToolbar;
      if (!selectionToolbar) selectionTools.hidden = true;
    },
    popup(value: boolean) {
      popupOpen = value;
      sync();
    },
    contextImage(address?: string): ClipCapture | undefined {
      const item =
        lastContext instanceof HTMLImageElement
          ? lastContext
          : Array.from(document.images).find(
              (image) => (image.currentSrc || image.src) === address,
            );
      return item ? captureFor(item) : undefined;
    },
  };
}
