import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { parseWebUrl } from '@clipcard/core';
import strings from '@clipcard/i18n/en';
import { Icon } from '@clipcard/ui';
import type { CardDraft } from '@clipcard/ui';
import { CardEditor } from '@clipcard/ui/card-editor';
import { DraftPreview } from '@clipcard/ui/card-preview';
import { getDraft, recentDrafts, saveDraft } from '@clipcard/ui/storage';
import type { BackgroundMessage, MadeCard } from './messages.ts';
import { browser } from 'wxt/browser';
import { webApp } from './site.ts';
import './popup.css';

const params = new URLSearchParams(location.search);
const permissionView = params.get('permission') === '1';
const initialShareOpen = params.get('share') === '1';
const draftId = params.get('draft');

function closeWindow() {
  if (window.parent === window) window.close();
  else window.parent.postMessage({ clipcard: 'close' }, '*');
}

function openWebsite(address: string) {
  return browser.tabs.create({ url: address });
}

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      className="clip-icon-button popup-close"
      type="button"
      aria-label={strings['action.close']}
      title={strings['action.close']}
      onClick={onClose}
    >
      <Icon name="close" />
    </button>
  );
}

function PreviewThumb({ draft }: { draft: CardDraft }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    if (!draft.thumb) return;
    const image = URL.createObjectURL(draft.thumb);
    setUrl(image);
    return () => URL.revokeObjectURL(image);
  }, [draft.thumb]);
  return url ? <img src={url} alt="" /> : <DraftPreview draft={draft} />;
}

function PhotoPermission() {
  const [granted, setGranted] = useState(false);
  async function allow() {
    try {
      setGranted(
        await browser.permissions.request({ origins: ['<all_urls>'] }),
      );
    } catch {
      setGranted(false);
    }
  }
  return (
    <section className="popup-empty">
      <CloseButton onClose={closeWindow} />
      <h1>{strings['welcome.permission']}</h1>
      <p>{strings['welcome.permissionSub']}</p>
      {granted ? <p role="status">{strings['welcome.photosEnabled']}</p> : null}
      <button
        type="button"
        className="clip-button clip-primary"
        onClick={granted ? closeWindow : () => void allow()}
      >
        {strings[granted ? 'welcome.done' : 'welcome.allow']}
      </button>
    </section>
  );
}

function Popup({
  initial,
  history,
}: {
  initial: CardDraft | null;
  history: CardDraft[];
}) {
  const [draft, setDraft] = useState(initial);
  const [url, setUrl] = useState('');
  const [working, setWorking] = useState(false);
  const [status, setStatus] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const queued = useRef(Promise.resolve());

  useEffect(() => {
    if (!draft) input.current?.focus();
  }, [draft]);

  function change(next: CardDraft) {
    setDraft(next);
    queued.current = queued.current
      .then(async () => {
        const saved = await saveDraft(next);
        const request: BackgroundMessage = {
          to: 'background',
          kind: 'remember',
          id: saved.id,
        };
        await browser.runtime.sendMessage(request);
      })
      .catch(() => setStatus(strings['card.savedFailed']));
  }

  function close() {
    void queued.current.then(closeWindow);
  }

  async function paste(value: string) {
    if (working) return;
    const address = parseWebUrl(value.trim());
    if (!address) {
      setStatus(strings['card.unsupported']);
      return;
    }
    setStatus('');
    setWorking(true);
    try {
      const request: BackgroundMessage = {
        to: 'background',
        kind: 'paste',
        address: address.href,
      };
      const result = (await browser.runtime.sendMessage(
        request,
      )) as MadeCard | null;
      const stored = result?.id ? await getDraft(result.id) : undefined;
      if (!stored) throw new Error('Card missing');
      setDraft(stored);
    } catch {
      setStatus(strings['card.renderFailed']);
    } finally {
      setWorking(false);
    }
  }

  useEffect(() => {
    if (draft) return;
    function onEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') closeWindow();
    }
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, [draft]);

  if (draft) {
    return (
      <>
        <CardEditor
          key={draft.id}
          draft={draft}
          onChange={change}
          onClose={close}
          openExternal={openWebsite}
          initialShareOpen={initialShareOpen}
        />
        {status ? (
          <p className="popup-status" role="status">
            {status}
          </p>
        ) : null}
      </>
    );
  }

  return (
    <section
      className="popup-empty"
      aria-label={strings['ext.shortName']}
      onPaste={(event) => {
        const pasted = event.clipboardData.getData('text/plain').trim();
        if (!parseWebUrl(pasted)) return;
        event.preventDefault();
        setUrl(pasted);
        void paste(pasted);
      }}
    >
      <CloseButton onClose={close} />
      <form
        className="popup-input"
        onSubmit={(event) => {
          event.preventDefault();
          void paste(url);
        }}
      >
        <Icon name="link" />
        <input
          ref={input}
          value={url}
          type="text"
          inputMode="url"
          placeholder={strings['empty.paste']}
          aria-label={strings['empty.paste']}
          onChange={(event) => setUrl(event.currentTarget.value)}
        />
        <button
          className="clip-button clip-primary"
          disabled={working || !url.trim()}
        >
          {strings['card.makeCard']}
        </button>
      </form>
      {status ? (
        <p className="popup-status" role="status">
          {status}
        </p>
      ) : null}
      {history.length ? (
        <section aria-labelledby="recent-label">
          <h2 id="recent-label">{strings['empty.recent']}</h2>
          <ul className="popup-recents">
            {history.map((recent) => (
              <li key={recent.id}>
                <button
                  type="button"
                  aria-label={recent.headline}
                  title={recent.headline}
                  onClick={() => setDraft(recent)}
                >
                  <PreviewThumb draft={recent} />
                </button>
              </li>
            ))}
          </ul>
          <a
            className="popup-web-app"
            href={webApp}
            target="_blank"
            rel="noreferrer"
          >
            {strings['card.openWebApp']}
          </a>
        </section>
      ) : null}
    </section>
  );
}

document.title = browser.i18n.getMessage('ext_shortName');
const lang = browser.i18n.getUILanguage();
document.documentElement.lang = lang;
document.documentElement.dir = /^(ar|fa|ur)(-|$)/i.test(lang) ? 'rtl' : 'ltr';

const host = document.querySelector('#root');
if (host) {
  const root = createRoot(host);
  if (permissionView) root.render(<PhotoPermission />);
  else {
    const [initial, history] = await Promise.all([
      draftId ? getDraft(draftId).catch(() => undefined) : undefined,
      recentDrafts().catch(() => []),
    ]);
    root.render(<Popup initial={initial ?? null} history={history} />);
  }
  if (window.parent !== window) {
    const observer = new ResizeObserver(() => {
      const wrap = host.querySelector<HTMLElement>('.clip-preview-wrap');
      const preview = wrap?.querySelector('.clip-preview');
      const ratio = Number(wrap?.style.getPropertyValue('--clip-card-ratio'));
      // Request the natural height so the frame can grow when the outer viewport grows.
      const extraHeight =
        wrap && preview && ratio > 0
          ? Math.max(
              0,
              wrap.clientWidth / ratio - preview.getBoundingClientRect().height,
            )
          : 0;
      window.parent.postMessage(
        {
          clipcard: 'resize',
          height: host.getBoundingClientRect().height + extraHeight,
        },
        '*',
      );
    });
    observer.observe(host);
  }
}
