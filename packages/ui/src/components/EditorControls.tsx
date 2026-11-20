import { useEffect, useEffectEvent, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import strings from '@clipcard/i18n/en';
import {
  CARD_FORMATS,
  CARD_TEMPLATES,
  THEMES,
  TEXT_COLORS,
  guardText,
  toCardColor,
  toTextColor,
} from '@clipcard/cards';
import type {
  CardColor,
  CardModel,
  CardOptions,
  EmphasisStyle,
  Template,
} from '@clipcard/cards';
import { limitHeadline } from '@clipcard/core';
import { copyPng, downloadPng, renderPng, shareFile } from '../actions.ts';
import type { CardDraft, Overrides } from '../draft.ts';
import { shareIntents } from '../share-intents.ts';
import { Icon } from './Icon.tsx';

type DraftUpdate = (next: CardDraft) => void;
type OverrideUpdate = (override: Partial<Overrides>) => void;

export const templateName = (template: Template) =>
  strings[('template.' + template) as keyof typeof strings];
const presets = Object.entries(THEMES) as [keyof typeof THEMES, CardColor][];
const emphasisTypes = ['box', 'line', 'color'] as const;
const quietColors = Object.entries(TEXT_COLORS);
const defaultEmphasis = {
  header: 'box',
  split: 'line',
  caps: 'color',
  duotone: 'color',
  solid: 'line',
  quote: 'line',
  overlay: 'color',
} as const;

export function UpdateGroup({
  name,
  children,
}: {
  name: string;
  children: ReactNode;
}) {
  return (
    <div className="clip-control-row">
      <span>{name}</span>
      <div role="group" aria-label={name}>
        {children}
      </div>
    </div>
  );
}

export function LookControls({
  options,
  model,
  update,
  overrides,
}: {
  options: CardOptions;
  model: CardModel;
  update: OverrideUpdate;
  overrides: Overrides;
}) {
  const theme = options.theme ?? THEMES.midnight;
  return (
    <div className="clip-look">
      <UpdateGroup name={strings['card.theme']}>
        {presets.map(([name, value]) => (
          <button
            key={name}
            type="button"
            className="clip-swatch"
            style={{ '--swatch': value.deep } as React.CSSProperties}
            aria-label={strings[('color.' + name) as keyof typeof strings]}
            title={strings[('color.' + name) as keyof typeof strings]}
            aria-pressed={theme.deep === value.deep}
            onClick={() => update({ theme: value })}
          />
        ))}
        <input
          type="color"
          className="clip-custom-color"
          title={strings['color.custom']}
          aria-label={strings['color.custom']}
          value={theme.deep}
          onChange={(event) =>
            update({ theme: toCardColor(event.target.value) })
          }
        />
      </UpdateGroup>
      <UpdateGroup name={strings['card.format']}>
        {CARD_FORMATS.map((format) => (
          <button
            key={format}
            type="button"
            className="clip-segment"
            aria-pressed={options.format === format}
            onClick={() => update({ format })}
          >
            {format}
          </button>
        ))}
      </UpdateGroup>
      <UpdateGroup name={strings['card.template']}>
        <select
          aria-label={strings['card.template']}
          value={overrides.template ?? 'auto'}
          onChange={(event) =>
            update({
              template:
                event.target.value === 'auto'
                  ? undefined
                  : (event.target.value as Template),
            })
          }
        >
          <option value="auto">{strings['card.auto']}</option>
          {CARD_TEMPLATES.filter(
            (template) =>
              model.image || template === 'solid' || template === 'quote',
          ).map((template) => (
            <option key={template} value={template}>
              {templateName(template)}
            </option>
          ))}
        </select>
      </UpdateGroup>
    </div>
  );
}

function ColorOptions({
  label,
  value,
  select,
  supports,
}: {
  label: string;
  value: string;
  select: (value: string) => void;
  supports: (value: string) => boolean;
}) {
  return (
    <UpdateGroup name={label}>
      {quietColors.map(([name, hex]) => {
        const colorName = strings[('color.' + name) as keyof typeof strings];
        const enabled = supports(hex);
        return (
          <button
            key={name}
            type="button"
            className="clip-swatch"
            aria-label={colorName}
            title={enabled ? colorName : strings['card.contrast']}
            style={{ '--swatch': hex } as React.CSSProperties}
            aria-pressed={value === hex}
            disabled={!enabled}
            onClick={() => select(hex)}
          />
        );
      })}
      <input
        type="color"
        className="clip-custom-color"
        title={strings['color.custom']}
        aria-label={label + ' · ' + strings['color.custom']}
        value={value}
        onChange={(event) => select(toTextColor(event.target.value))}
      />
    </UpdateGroup>
  );
}

export function TextControls({
  draft,
  options,
  model,
  update,
  onChange,
  compact = false,
}: {
  draft: CardDraft;
  options: CardOptions;
  model: CardModel;
  update: OverrideUpdate;
  onChange: DraftUpdate;
  compact?: boolean;
}) {
  const emphasis = options.emphasis ?? defaultEmphasis[options.template];
  const currentKey =
    options.keyColor ?? options.theme?.light ?? THEMES.midnight.light;
  const currentText = options.textColor ?? TEXT_COLORS.white;
  const [title, setTitle] = useState(draft.headline);
  const words = [...draft.headline.matchAll(/\S+/gu)];
  const [start, end] = model.emphasisRange ?? [-1, -1];
  function setHeadline(value: string) {
    setTitle(value);
    const headline = limitHeadline(value);
    if (headline && headline !== draft.headline) {
      onChange({
        ...draft,
        headline,
        overrides: { ...draft.overrides, phrase: undefined },
      });
    }
  }

  const headlineControls = (
    <>
      <label className="clip-label">
        <span>{strings['card.title']}</span>
        <textarea
          value={title}
          placeholder={strings['card.title']}
          rows={3}
          onChange={(event) => setHeadline(event.target.value)}
          onBlur={() => setTitle(draft.headline)}
        />
      </label>
      {draft.headline !== draft.original ? (
        <button
          type="button"
          className="clip-inline-button"
          onClick={() => setHeadline(draft.original)}
        >
          {strings['state.edited']} · {strings['action.reset']}
        </button>
      ) : null}
      {compact ? null : <p className="clip-note">{strings['text.hint']}</p>}
      <div
        className="clip-words"
        role="group"
        aria-label={strings['text.hint']}
        lang={model.lang}
        dir={model.dir}
      >
        {words.map((word) => {
          const final = word.index + word[0].length;
          const selected = word.index >= start && final <= end;
          return (
            <button
              type="button"
              key={word.index}
              aria-pressed={selected}
              onClick={() =>
                update({
                  phrase: selected
                    ? null
                    : [
                        start < 0 ? word.index : Math.min(start, word.index),
                        Math.max(end, final),
                      ],
                })
              }
            >
              {word[0]}
            </button>
          );
        })}
      </div>
    </>
  );
  const emphasisControls = (
    <UpdateGroup name={strings['card.emphasis']}>
      {emphasisTypes.map((style: EmphasisStyle) => (
        <button
          type="button"
          key={style}
          className="clip-segment"
          aria-pressed={emphasis === style}
          onClick={() => update({ emphasis: style })}
        >
          {strings[('text.' + style) as keyof typeof strings]}
        </button>
      ))}
    </UpdateGroup>
  );
  const keyControls = (
    <ColorOptions
      label={strings['card.keyColor']}
      value={currentKey}
      select={(keyColor) => update({ keyColor })}
      supports={(value) =>
        guardText(model.photoLight ?? 0.12, currentText, value, emphasis, 0.86)
          .key === toTextColor(value)
      }
    />
  );
  const textColorControls =
    options.template === 'quote' ? null : (
      <ColorOptions
        label={strings['card.textColor']}
        value={currentText}
        select={(textColor) => update({ textColor })}
        supports={(value) =>
          guardText(model.photoLight ?? 0.12, value, currentKey, emphasis, 0.86)
            .text === toTextColor(value)
        }
      />
    );
  if (compact) {
    return (
      <>
        <div className="clip-text-shortcuts">
          {emphasisControls}
          {keyControls}
          {textColorControls ? (
            <details className="clip-text-palette">
              <summary
                aria-label={strings['card.textColor']}
                title={strings['card.textColor']}
              >
                Aa
              </summary>
              {textColorControls}
            </details>
          ) : null}
        </div>
        <details className="clip-text-word-menu">
          <summary>{strings['text.hint']}</summary>
          <div className="clip-text-controls">{headlineControls}</div>
        </details>
      </>
    );
  }
  return (
    <div className="clip-text-controls">
      {headlineControls}
      {emphasisControls}
      {keyControls}
      {textColorControls}
    </div>
  );
}

export function SourceDetails({
  model,
  onPhoto,
}: {
  model: CardModel;
  onPhoto?: () => void;
}) {
  return (
    <div className="clip-source-block">
      {model.sourceUrl ? (
        <a
          href={model.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="clip-source"
        >
          {model.image ? (
            <img src={model.image} alt="" />
          ) : (
            <span className="clip-clipped-source">
              <Icon name="link" />
            </span>
          )}
          <span>
            <strong>{model.outlet}</strong>
            <small>{new URL(model.sourceUrl).hostname}</small>
          </span>
          <Icon name="qr" />
        </a>
      ) : (
        <p className="clip-note">{strings['card.noSource']}</p>
      )}
      {onPhoto && !model.image ? (
        <button className="clip-inline-button" type="button" onClick={onPhoto}>
          {strings['card.addPhoto']}
        </button>
      ) : null}
    </div>
  );
}

export function CardActions({
  model,
  options,
  onSave,
  onSaveForLater,
  onOpen,
  openExternal,
  initialShareOpen = false,
  emphasis = 'copy',
}: {
  model: CardModel;
  options: CardOptions;
  onSave?: () => Promise<void>;
  onSaveForLater?: () => void;
  onOpen?: () => void;
  openExternal?: (address: string) => Promise<unknown>;
  initialShareOpen?: boolean;
  emphasis?: 'copy' | 'share';
}) {
  const [status, setStatus] = useState('');
  const [ready, setReady] = useState<{
    model: CardModel;
    options: CardOptions;
    png: Blob;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const pending = useRef<{
    model: CardModel;
    options: CardOptions;
    png: Promise<Blob>;
  } | null>(null);
  const [menu, setMenu] = useState(initialShareOpen);
  const canShare =
    typeof navigator !== 'undefined' &&
    typeof navigator.canShare === 'function' &&
    typeof navigator.share === 'function';

  useEffect(() => {
    if (!(canShare || emphasis === 'share')) return;
    let current = true;
    const timeout = setTimeout(() => {
      let item = pending.current;
      if (!item || item.model !== model || item.options !== options) {
        item = { model, options, png: renderPng(model, options) };
        pending.current = item;
      }
      item.png
        .then((png) => {
          if (current) setReady({ model, options, png });
        })
        .catch(() => {
          if (current) pending.current = null;
        });
    }, 260);
    return () => {
      current = false;
      clearTimeout(timeout);
    };
  }, [canShare, emphasis, model, options]);

  function png() {
    if (pending.current?.model === model && pending.current.options === options)
      return pending.current.png;
    const next = renderPng(model, options);
    pending.current = { model, options, png: next };
    next.catch(() => {
      if (pending.current?.png === next) pending.current = null;
    });
    return next;
  }

  async function copy() {
    setBusy(true);
    try {
      await copyPng(png());
      setStatus(strings['toast.copied']);
    } catch {
      setStatus(strings['card.copyFailed']);
    } finally {
      setBusy(false);
    }
  }

  async function download() {
    setBusy(true);
    try {
      downloadPng(await png(), model.headline);
    } catch {
      setStatus(strings['card.renderFailed']);
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    setStatus('');
    if (openExternal) {
      setMenu((open) => !open);
      return;
    }
    const file =
      ready?.model === model && ready.options === options ? ready.png : null;
    const shared = file ? shareFile(file, model.headline) : null;
    if (!shared) {
      setMenu((open) => !open);
      return;
    }
    try {
      await shared;
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError'))
        setMenu(true);
    }
  }

  async function save() {
    try {
      await onSave?.();
      setStatus(strings['card.savedLocal']);
    } catch {
      setStatus(strings['card.savedFailed']);
    }
  }

  const keyboardAction = useEffectEvent((event: KeyboardEvent) => {
    if (
      busy ||
      !(event.ctrlKey || event.metaKey) ||
      event.altKey ||
      (event.target instanceof Element &&
        event.target.closest('input, textarea, select, [contenteditable]'))
    )
      return;
    const key = event.key.toLowerCase();
    if (key !== 'c' && key !== 's') return;
    event.preventDefault();
    if (key === 'c') void copy();
    else void download();
  });
  useEffect(() => {
    if (!openExternal) return;
    function onKey(event: KeyboardEvent) {
      keyboardAction(event);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openExternal]);

  async function shareTo(address: string) {
    if (!openExternal) return;
    setBusy(true);
    try {
      await copyPng(png());
      await openExternal(address);
      setStatus(strings['toast.copied']);
    } catch {
      setStatus(strings['card.copyFailed']);
    } finally {
      setBusy(false);
    }
  }

  const copyButton = (
    <button
      className={
        emphasis === 'copy' ? 'clip-button clip-primary' : 'clip-button'
      }
      type="button"
      disabled={busy}
      onClick={copy}
    >
      <Icon name="copy" />
      {strings[openExternal ? 'action.copy' : 'card.copyImage']}
    </button>
  );

  return (
    <div className="clip-action-area">
      <div className="clip-actions">
        {emphasis === 'copy' ? (
          copyButton
        ) : (
          <button
            type="button"
            className="clip-button clip-primary"
            onClick={share}
            aria-expanded={menu}
          >
            <Icon name="share" />
            {strings['action.share']}
          </button>
        )}
        {!openExternal ? (
          <button
            type="button"
            className="clip-icon-button"
            onClick={download}
            disabled={busy}
            aria-label={strings['share.download']}
            title={strings['share.download']}
          >
            <Icon name="download" />
          </button>
        ) : null}
        {emphasis === 'copy' && !onOpen ? (
          <button
            type="button"
            className="clip-icon-button"
            onClick={share}
            aria-expanded={menu}
            aria-label={strings['action.share']}
            title={strings['action.share']}
          >
            <Icon name="share" />
          </button>
        ) : null}
        {onSave || onSaveForLater ? (
          <button
            type="button"
            className="clip-icon-button"
            onClick={onSaveForLater ?? save}
            aria-label={strings['action.save']}
            title={strings['action.save']}
          >
            <Icon name="bookmark" />
          </button>
        ) : null}
        {onOpen ? (
          <button type="button" className="clip-button" onClick={onOpen}>
            {strings['card.openApp']}
          </button>
        ) : null}
      </div>
      {menu ? (
        <div className="clip-share-options">
          {emphasis === 'share' ? copyButton : null}
          {openExternal ? (
            <>
              <button
                className="clip-button"
                type="button"
                onClick={() => void download()}
                disabled={busy}
              >
                {strings['share.download']}
              </button>
              {shareIntents(model.headline, model.sourceUrl).map(
                ({ label, address }) => (
                  <button
                    className="clip-button"
                    key={label}
                    type="button"
                    onClick={() => void shareTo(address)}
                    disabled={busy}
                  >
                    {label}
                  </button>
                ),
              )}
              {ready?.model === model &&
              ready.options === options &&
              navigator.canShare?.({
                files: [
                  new File([ready.png], 'clipcard.png', { type: 'image/png' }),
                ],
              }) ? (
                <button
                  className="clip-button"
                  type="button"
                  onClick={() => {
                    const text = [model.headline, model.sourceUrl]
                      .filter(Boolean)
                      .join('\n');
                    void shareFile(ready.png, model.headline, text)?.catch(
                      () => undefined,
                    );
                  }}
                >
                  {strings['share.more']}
                </button>
              ) : null}
            </>
          ) : null}
          {model.sourceUrl ? (
            <button
              type="button"
              className="clip-button"
              onClick={() => {
                navigator.clipboard
                  .writeText(model.sourceUrl ?? '')
                  .then(() => setStatus(strings['toast.copied']))
                  .catch(() => setStatus(strings['card.copyFailed']));
              }}
            >
              {strings['menu.cleanLink']}
            </button>
          ) : null}
        </div>
      ) : null}
      <div role="status" className="clip-status">
        {status}
      </div>
    </div>
  );
}
