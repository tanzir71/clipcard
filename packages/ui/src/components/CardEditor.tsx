import { useEffect, useState, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import strings from '@clipcard/i18n/en';
import { CARD_TEMPLATES, chooseTemplate } from '@clipcard/cards';
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
  beforePreview,
  view = 'popup',
}: {
  draft: CardDraft;
  onChange: (draft: CardDraft) => void;
  onClose: () => void;
  onPhoto?: () => void;
  onSave: () => Promise<void>;
  beforePreview?: ReactNode;
  view?: 'popup' | 'workspace' | 'shared';
}) {
  const [active, setActive] = useState<Panel>('text');
  const [tabShown, setTabShown] = useState(false);
  const [autoOpen, setAutoOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const phone = useSyncExternalStore(observeViewport, isPhone, desktopOnServer);
  const { model, options } = useDraftArt(draft);
  const selected = draft.overrides.template;
  const templates = availableTemplates(model);
  const autoLabel = strings['card.auto'] + ' · ' + options.format;

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
    setActive('text');
    setTabShown(true);
    setInspectorOpen(true);
  }

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      if (autoOpen) setAutoOpen(false);
      else if (inspectorOpen && !phone) setInspectorOpen(false);
      else if (view === 'popup' && tabShown) setTabShown(false);
      else onClose();
    }
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [autoOpen, inspectorOpen, phone, tabShown, view, onClose]);

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
        <div className="clip-mode-indicator">
          <Icon name="card" size={14} />
          {strings['mode.card']}
        </div>
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
          <span aria-hidden="true"></span>
          {autoLabel}
          <span aria-hidden="true">⌄</span>
        </button>
      </header>
      <div className="clip-editor-canvas">
        {beforePreview ? (
          <div className="clip-canvas-input">{beforePreview}</div>
        ) : null}
        <div className="clip-preview-wrap">
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
            className="clip-inline-button"
            type="button"
            onClick={openText}
          >
            {strings['card.text']}
          </button>
        ) : null}
        {view === 'workspace' || (view === 'popup' && tabShown) ? (
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
          emphasis={phone || view === 'shared' ? 'share' : 'copy'}
        />
      </div>
    </section>
  );
}
