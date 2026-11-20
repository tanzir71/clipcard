import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { interfaceStrings as strings } from '@clipcard/i18n';
import { CARD_TEMPLATES, chooseTemplate, tokens } from '@clipcard/cards';
import type { CardModel, CardOptions, Template } from '@clipcard/cards';
import type { CardDraft, Overrides } from '../draft.ts';
import { CardPreview, useDraftArt } from './CardPreview.tsx';
import {
  CardActions,
  LookControls,
  SourceDetails,
  TextControls,
  templateName,
} from './EditorControls.tsx';
import { Icon } from './Icon.tsx';
import { DraftNameForm } from './DraftNameForm.tsx';

export function availableTemplates(model: CardModel): readonly Template[] {
  return model.image ? CARD_TEMPLATES : (['solid', 'quote'] as const);
}

export function TemplateStrip({
  model,
  options,
  active,
  setTemplate,
}: {
  model: CardModel;
  options: CardOptions;
  active?: Template;
  setTemplate: (template?: Template) => void;
}) {
  const thumbnails = [
    {
      template: chooseTemplate(model),
      name: strings['card.auto'],
      id: undefined,
    },
    ...availableTemplates(model).map((template) => ({
      template,
      name: templateName(template),
      id: template,
    })),
  ];
  return (
    <div
      className="clip-template-strip"
      role="group"
      aria-label={strings['card.template']}
    >
      {thumbnails.map(({ template, name, id }) => (
        <div className="clip-template-option" key={id ?? 'auto'}>
          <div className="clip-thumb-image" aria-hidden="true">
            <CardPreview
              model={model}
              options={{ ...options, template, format: '4:5' }}
            />
          </div>
          <button
            type="button"
            aria-pressed={id === active}
            className="clip-template-thumb"
            onClick={() => setTemplate(id)}
          >
            {name}
          </button>
        </div>
      ))}
    </div>
  );
}

type Panel = 'text' | 'look' | 'sources';
const panels = ['text', 'look', 'sources'] as const;
const narrowEditor = '(max-width: 767px)';
function observeViewport(onChange: () => void) {
  const query = window.matchMedia(narrowEditor);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}
const isPhone = () => window.matchMedia(narrowEditor).matches;
const desktopOnServer = () => false;

export function CardEditor({
  draft,
  onChange,
  onClose,
  onPhoto,
  onSave,
  onSaveForLater,
  onGrid,
  openExternal,
  initialShareOpen,
  beforePreview,
  view = 'popup',
}: {
  draft: CardDraft;
  onChange: (draft: CardDraft) => void;
  onClose: () => void;
  onPhoto?: () => void;
  onSave?: () => Promise<void>;
  onSaveForLater?: (title: string) => Promise<unknown>;
  onGrid?: () => void;
  openExternal?: (address: string) => Promise<unknown>;
  initialShareOpen?: boolean;
  beforePreview?: ReactNode;
  view?: 'popup' | 'workspace' | 'shared';
}) {
  const [active, setActive] = useState<Panel>('text');
  const [tabShown, setTabShown] = useState(false);
  const [autoOpen, setAutoOpen] = useState(false);
  const [naming, setNaming] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [textLayout, setTextLayout] = useState({ top: 8, bottom: 32, bar: 40 });
  const previewWrap = useRef<HTMLDivElement>(null);
  const narrow = useSyncExternalStore(
    observeViewport,
    isPhone,
    desktopOnServer,
  );
  const phone = narrow && view !== 'popup';
  const { model, options } = useDraftArt(draft);
  const [previewWidth, previewHeight] = tokens.card.formats[options.format];
  const selected = draft.overrides.template;
  const templates = availableTemplates(model);
  const autoLabel = draft.destination
    ? strings['auto.chip']
        .replace('{format}', options.format)
        .replace('{destination}', strings[`destination.${draft.destination}`])
    : strings['card.auto'] + ' · ' + options.format;

  function update(overrides: Partial<Overrides>) {
    onChange({ ...draft, overrides: { ...draft.overrides, ...overrides } });
  }

  function cycle(delta: number) {
    const index = templates.indexOf(options.template);
    update({
      template:
        templates[
          (Math.max(0, index) + delta + templates.length) % templates.length
        ],
    });
  }

  function openText() {
    if (openExternal) {
      setTabShown((shown) => !shown);
      return;
    }
    setActive('text');
    setTabShown(true);
    setInspectorOpen(true);
  }

  useEffect(() => {
    const wrap = previewWrap.current;
    if (!wrap || !tabShown || !openExternal) return;
    const align = () => {
      const headline = wrap.querySelector('.cc-headline');
      if (!headline) return;
      const box = wrap.getBoundingClientRect();
      const text = headline.getBoundingClientRect();
      const meta =
        options.template === 'header'
          ? wrap.querySelector('.cc-meta')?.getBoundingClientRect()
          : undefined;
      const top = Math.max(4, text.top - box.top - 4);
      const bottom = Math.max(text.bottom, meta?.bottom ?? 0) - box.top - 2;
      setTextLayout({
        top,
        bottom,
        bar: Math.max(34, Math.min(bottom + 12, box.height - 50)),
      });
    };
    const observer = new ResizeObserver(align);
    observer.observe(wrap);
    align();
    return () => observer.disconnect();
  }, [
    tabShown,
    openExternal,
    draft.headline,
    options.format,
    options.template,
  ]);
  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      if (openExternal) onClose();
      else if (autoOpen) setAutoOpen(false);
      else if (inspectorOpen && !phone) setInspectorOpen(false);
      else if (view === 'popup' && tabShown) setTabShown(false);
      else onClose();
    }
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [autoOpen, inspectorOpen, phone, tabShown, view, onClose, openExternal]);

  const keyboardCycle = useEffectEvent((event: KeyboardEvent) => {
    if (
      !(event.key === 'ArrowLeft' || event.key === 'ArrowRight') ||
      (event.target instanceof Element &&
        event.target.closest(
          'input, textarea, select, button, [contenteditable]',
        ))
    ) {
      return;
    }
    event.preventDefault();
    cycle(event.key === 'ArrowLeft' ? -1 : 1);
  });
  useEffect(() => {
    if (!openExternal) return;
    const onArrow = (event: KeyboardEvent) => {
      keyboardCycle(event);
    };
    window.addEventListener('keydown', onArrow);
    return () => window.removeEventListener('keydown', onArrow);
  }, [openExternal]);

  return (
    <section
      className={'clip-editor clip-editor-' + view}
      aria-label={strings['card.editCard']}
    >
      <header className="clip-editor-header">
        <button
          type="button"
          className="clip-icon-button clip-editor-close"
          aria-label={strings['action.close']}
          title={strings['action.close']}
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
        <div className="clip-editor-name">
          <h1>{view === 'shared' ? strings['card.shared'] : draft.headline}</h1>
          {view === 'workspace' ? (
            <span>
              {strings['card.saved']} · {strings['card.justNow']}
            </span>
          ) : null}
        </div>
        <div
          className="clip-mode-indicator"
          aria-label={openExternal ? strings['mode.card'] : undefined}
          role={openExternal ? 'img' : undefined}
        >
          <Icon name="card" size={14} />
          {openExternal ? null : strings['mode.card']}
        </div>
        {onGrid ? (
          <button
            type="button"
            className="clip-icon-button"
            aria-label={strings['mode.grid']}
            title={strings['mode.grid']}
            onClick={onGrid}
          >
            <Icon name="grid" size={16} />
          </button>
        ) : null}
        {view === 'workspace' ? (
          <button
            type="button"
            className="clip-button clip-inspector-toggle"
            aria-expanded={inspectorOpen}
            onClick={() => setInspectorOpen((open) => !open)}
          >
            {strings['card.editCard']}
          </button>
        ) : null}
        <button
          className="clip-button clip-auto"
          type="button"
          onClick={() => {
            setAutoOpen((open) => !open);
            setInspectorOpen(true);
          }}
          aria-expanded={autoOpen}
        >
          <span
            aria-hidden="true"
            style={{ backgroundColor: options.theme?.deep }}
          ></span>
          {autoLabel}
          <span aria-hidden="true">⌄</span>
        </button>
      </header>
      <div className="clip-editor-canvas">
        {beforePreview ? (
          <div className="clip-canvas-input">{beforePreview}</div>
        ) : null}
        <div
          className="clip-preview-wrap"
          ref={previewWrap}
          style={
            {
              '--clip-card-ratio': previewWidth / previewHeight,
            } as CSSProperties
          }
        >
          <CardPreview model={model} options={options} onHeadline={openText} />
          <button
            type="button"
            aria-label={strings['action.templatePrev']}
            title={strings['action.templatePrev']}
            className="clip-preview-arrow clip-prev"
            onClick={() => cycle(-1)}
          >
            <Icon name="arrowLeft" />
          </button>
          <button
            type="button"
            aria-label={strings['action.templateNext']}
            title={strings['action.templateNext']}
            className="clip-preview-arrow clip-next"
            onClick={() => cycle(1)}
          >
            <Icon name="arrowRight" />
          </button>
          {view === 'popup' ? (
            <button
              type="button"
              className="clip-preview-close"
              aria-label={strings['action.close']}
              title={strings['action.close']}
              onClick={onClose}
            >
              <Icon name="close" />
            </button>
          ) : null}
          {openExternal && tabShown ? (
            <>
              <div
                aria-hidden="true"
                className="clip-text-outline"
                style={{
                  insetBlockStart: textLayout.top,
                  blockSize: textLayout.bottom - textLayout.top,
                }}
              />
              <div
                className="clip-text-bar"
                style={{ insetBlockStart: textLayout.bar }}
              >
                <TextControls
                  draft={draft}
                  model={model}
                  options={options}
                  update={update}
                  onChange={onChange}
                  compact
                />
              </div>
            </>
          ) : null}
        </div>
        {view === 'workspace' ? (
          <TemplateStrip
            model={model}
            options={options}
            active={selected}
            setTemplate={(template) => update({ template })}
          />
        ) : null}
      </div>
      <div
        className={
          'clip-editor-inspector' +
          (inspectorOpen ? ' clip-inspector-open' : '')
        }
      >
        {autoOpen ? (
          <LookControls
            model={model}
            options={options}
            update={update}
            overrides={draft.overrides}
          />
        ) : null}
        {view === 'popup' && !tabShown ? (
          <button
            className={
              openExternal
                ? 'clip-inline-button clip-text-trigger'
                : 'clip-inline-button'
            }
            type="button"
            onClick={openText}
          >
            {strings['card.text']}
          </button>
        ) : null}
        {view === 'workspace' ||
        (view === 'popup' && tabShown && !openExternal) ? (
          <>
            <div
              className="clip-panel-tabs"
              role="group"
              aria-label={strings['card.editCard']}
            >
              {panels.map((panel) => (
                <button
                  type="button"
                  key={panel}
                  aria-pressed={active === panel}
                  onClick={() => {
                    setActive(panel);
                    if (panel === 'look') setAutoOpen(true);
                  }}
                >
                  {strings[('card.' + panel) as keyof typeof strings]}
                </button>
              ))}
            </div>
            <div className="clip-desktop-source">
              <h2>{strings['card.sources']}</h2>
              <SourceDetails model={model} onPhoto={onPhoto} />
            </div>
            <div
              className={
                active === 'text'
                  ? 'clip-text-panel is-active'
                  : 'clip-text-panel'
              }
            >
              <TextControls
                draft={draft}
                model={model}
                options={options}
                update={update}
                onChange={onChange}
              />
            </div>
            {active === 'sources' ? (
              <div className="clip-phone-source">
                <SourceDetails model={model} onPhoto={onPhoto} />
              </div>
            ) : null}
          </>
        ) : null}
        {view === 'shared' && !model.image && onPhoto ? (
          <p className="clip-note">
            {strings['card.noPhoto']}{' '}
            <button
              className="clip-inline-button"
              type="button"
              onClick={onPhoto}
            >
              {strings['card.addPhoto']}
            </button>
          </p>
        ) : null}
        <CardActions
          model={model}
          options={options}
          onSave={onSave}
          onSaveForLater={
            onSaveForLater ? () => setNaming((visible) => !visible) : undefined
          }
          openExternal={openExternal}
          initialShareOpen={initialShareOpen}
          emphasis={phone || view === 'shared' ? 'share' : 'copy'}
        />
        {naming && onSaveForLater ? (
          <DraftNameForm title={draft.headline} save={onSaveForLater} />
        ) : null}
      </div>
    </section>
  );
}
