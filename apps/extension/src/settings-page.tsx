import { FLAGS } from '@clipcard/core/flags';
import { GifSettings } from '@clipcard/ui/gif-settings';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { CARD_FORMATS, CARD_TEMPLATES, THEMES } from '@clipcard/cards';
import {
  cardLanguages,
  interfaceLanguages,
  languageName,
} from '@clipcard/i18n';
import type { UiStrings } from '@clipcard/i18n';
import { CollectionBackupControls } from '@clipcard/ui/collection-backup-controls';
import { clearDraftCollections } from '@clipcard/ui/collections';
import { browser } from 'wxt/browser';
import { prepareMark } from './mark-image.ts';
import { SettingsBrand } from './settings-brand.tsx';
import { useUserSettings } from './use-user-settings.ts';
import type { UserSettings } from './user-settings.ts';
import './settings.css';

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="settings-row">
      <span>{label}</span>
      <div className="settings-control">{children}</div>
    </div>
  );
}

function Switch({
  label,
  checked,
  change,
}: {
  label: string;
  checked: boolean;
  change: (checked: boolean) => void;
}) {
  return (
    <input
      className="settings-switch"
      type="checkbox"
      role="switch"
      aria-label={label}
      checked={checked}
      onChange={(event) => change(event.currentTarget.checked)}
    />
  );
}

function Choices<T extends string>({
  label,
  list,
  selected,
  change,
}: {
  label: string;
  list: ReadonlyArray<readonly [T, string]>;
  selected: T;
  change: (value: T) => void;
}) {
  return (
    <div className="settings-choices" role="group" aria-label={label}>
      {list.map(([value, text]) => (
        <button
          key={value}
          type="button"
          aria-pressed={selected === value}
          onClick={() => change(value)}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

const sections = ['general', 'quickAccess', 'cards', 'privacy'] as const;
type Panel = (typeof sections)[number];
const defaultFormats = ['auto', ...CARD_FORMATS] as const;

export function SettingsPage({ update }: { update: string | null }) {
  const { change, settings, ready, strings, error } = useUserSettings();
  const [active, setActive] = useState<Panel>('general');
  const [shortcut, setShortcut] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [status, setStatus] = useState('');
  const [markError, setMarkError] = useState(false);
  const [permission, setPermission] = useState(false);

  useEffect(() => {
    void browser.commands
      .getAll()
      .then((items) => {
        setShortcut(
          items.find(({ name }) => name === 'copy-clipcard')?.shortcut ?? '',
        );
      })
      .catch(() => undefined);
    void browser.permissions
      .contains({ origins: ['<all_urls>'] })
      .then(setPermission)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    document.title =
      strings['settings.title'] + ' · ' + strings['ext.shortName'];
  }, [strings]);

  function save<K extends keyof UserSettings>(key: K, value: UserSettings[K]) {
    void change(key, value).catch(() => setStatus(strings['card.savedFailed']));
  }

  function toggle(
    key: 'selectionToolbar' | 'qr' | 'markEdited' | 'texture' | 'keepHistory',
    copyKey: keyof UiStrings,
  ) {
    const label = strings[copyKey];
    return (
      <Row label={label}>
        <Switch
          label={label}
          checked={settings[key]}
          change={(checked) => save(key, checked)}
        />
      </Row>
    );
  }

  async function setMark(file?: File) {
    if (!file) return;
    setMarkError(false);
    try {
      await change('markImage', await prepareMark(file));
    } catch {
      setMarkError(true);
    }
  }

  async function clear() {
    try {
      await clearDraftCollections();
      setConfirm(false);
      setStatus(strings['settings.historyCleared']);
    } catch {
      setStatus(strings['card.savedFailed']);
    }
  }

  return (
    <main className="settings-main">
      <aside className="settings-side">
        <SettingsBrand name={strings['ext.shortName']} />
        {update ? (
          <a
            className="popup-update"
            href={update}
            target="_blank"
            rel="noreferrer"
          >
            {strings['settings.updateAvailable']}
          </a>
        ) : null}
        <nav aria-label={strings['settings.title']}>
          {sections.map((section) => (
            <a
              key={section}
              href={'#' + section}
              aria-current={active === section ? 'location' : undefined}
              onClick={() => setActive(section)}
            >
              {strings[('settings.' + section) as keyof UiStrings]}
            </a>
          ))}
        </nav>
      </aside>
      <div className="settings-body">
        {FLAGS.gifs ? <GifSettings /> : null}
        <fieldset disabled={!ready} className="settings-fields">
          <section id="general" aria-labelledby="heading-general">
            <h1 id="heading-general">{strings['settings.general']}</h1>
            <div className="settings-panel">
              <Row label={strings['settings.interfaceLanguage']}>
                <select
                  aria-label={strings['settings.interfaceLanguage']}
                  value={settings.interfaceLanguage}
                  onChange={(event) =>
                    save(
                      'interfaceLanguage',
                      event.currentTarget
                        .value as UserSettings['interfaceLanguage'],
                    )
                  }
                >
                  {interfaceLanguages.map((lang) => (
                    <option key={lang} value={lang} lang={lang}>
                      {languageName(lang)}
                    </option>
                  ))}
                </select>
              </Row>
              <Row label={strings['settings.cardLanguage']}>
                <select
                  aria-label={strings['settings.cardLanguage']}
                  value={settings.cardLanguage}
                  onChange={(event) =>
                    save(
                      'cardLanguage',
                      event.currentTarget.value as UserSettings['cardLanguage'],
                    )
                  }
                >
                  <option value="auto">
                    {strings['settings.cardLanguageAuto']}
                  </option>
                  {cardLanguages.map((lang) => (
                    <option key={lang} value={lang} lang={lang}>
                      {languageName(lang)}
                    </option>
                  ))}
                </select>
              </Row>
              <Row label={strings['settings.numerals']}>
                <Choices
                  label={strings['settings.numerals']}
                  list={[
                    ['native', strings['settings.numeralsNative']],
                    ['western', strings['settings.numeralsWestern']],
                  ]}
                  selected={settings.numerals}
                  change={(value) => save('numerals', value)}
                />
              </Row>
              <Row label={strings['settings.defaultFormat']}>
                <Choices
                  label={strings['settings.defaultFormat']}
                  list={defaultFormats.map((value) => [
                    value,
                    value === 'auto' ? strings['settings.auto'] : value,
                  ])}
                  selected={settings.format}
                  change={(value) => save('format', value)}
                />
              </Row>
              <Row label={strings['settings.defaultTemplate']}>
                <select
                  aria-label={strings['settings.defaultTemplate']}
                  value={settings.template}
                  onChange={(event) =>
                    save(
                      'template',
                      event.currentTarget.value as UserSettings['template'],
                    )
                  }
                >
                  <option value="auto">{strings['settings.auto']}</option>
                  {CARD_TEMPLATES.map((template) => (
                    <option key={template} value={template}>
                      {strings[('template.' + template) as keyof UiStrings]}
                    </option>
                  ))}
                </select>
              </Row>
            </div>
          </section>
          <section id="quickAccess" aria-labelledby="heading-quick">
            <h2 id="heading-quick">{strings['settings.quickAccess']}</h2>
            <div className="settings-panel">
              <Row label={strings['settings.buttonOnLinks']}>
                <Choices
                  label={strings['settings.buttonOnLinks']}
                  list={[
                    ['off', strings['settings.off']],
                    ['previews', strings['settings.previews']],
                    ['all', strings['settings.all']],
                  ]}
                  selected={settings.links}
                  change={(value) => save('links', value)}
                />
              </Row>
              {toggle('selectionToolbar', 'settings.selectionToolbar')}
              <Row label={strings['settings.shortcut']}>
                <button
                  className="settings-shortcut"
                  type="button"
                  aria-label={strings['settings.shortcut']}
                  onClick={() =>
                    void browser.tabs
                      .create({ url: 'chrome://extensions/shortcuts' })
                      .catch(() => setStatus(strings['card.savedFailed']))
                  }
                >
                  {shortcut
                    ? shortcut
                        .split('+')
                        .map((part) => <kbd key={part}>{part}</kbd>)
                    : strings['action.edit']}
                </button>
              </Row>
            </div>
          </section>
          <section id="cards" aria-labelledby="heading-cards">
            <h2 id="heading-cards">{strings['settings.cards']}</h2>
            <div className="settings-panel">
              {toggle('qr', 'settings.qrCode')}
              {toggle('markEdited', 'settings.markEdited')}
              <Row label={strings['settings.defaultColor']}>
                <div
                  className="settings-palette"
                  role="group"
                  aria-label={strings['settings.defaultColor']}
                >
                  {Object.entries(THEMES).map(([name, { deep }]) => (
                    <button
                      key={name}
                      type="button"
                      className="settings-swatch"
                      style={{ backgroundColor: deep }}
                      aria-label={strings[('color.' + name) as keyof UiStrings]}
                      title={strings[('color.' + name) as keyof UiStrings]}
                      aria-pressed={(settings.color || 'midnight') === name}
                      onClick={() => save('color', name)}
                    />
                  ))}
                  <input
                    className="settings-color"
                    type="color"
                    aria-label={strings['color.custom']}
                    title={strings['color.custom']}
                    value={
                      settings.color.startsWith('#')
                        ? settings.color
                        : '#172542'
                    }
                    onChange={(event) =>
                      save('color', event.currentTarget.value)
                    }
                  />
                </div>
              </Row>
              <Row label={strings['settings.yourMark']}>
                {settings.markImage ? (
                  <>
                    <img
                      className="settings-mark-preview"
                      src={settings.markImage}
                      alt=""
                    />
                    <button type="button" onClick={() => save('markImage', '')}>
                      {strings['settings.removeMark']}
                    </button>
                  </>
                ) : (
                  <label className="settings-mark-upload">
                    {strings['settings.chooseMark']}
                    <input
                      type="file"
                      accept="image/png,image/svg+xml"
                      onChange={(event) =>
                        void setMark(event.currentTarget.files?.[0])
                      }
                    />
                  </label>
                )}
                {markError ? (
                  <span role="alert">{strings['settings.markFailed']}</span>
                ) : null}
              </Row>
              {toggle('texture', 'settings.texture')}
            </div>
          </section>
          <section id="privacy" aria-labelledby="heading-privacy">
            <h2 id="heading-privacy">{strings['settings.privacy']}</h2>
            <div className="settings-panel">
              {toggle('keepHistory', 'settings.keepHistory')}
              <Row label={strings['welcome.permission']}>
                {permission ? (
                  <span role="status">{strings['welcome.photosEnabled']}</span>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      void browser.permissions
                        .request({ origins: ['<all_urls>'] })
                        .then(setPermission, () =>
                          setStatus(strings['card.savedFailed']),
                        )
                    }
                  >
                    {strings['welcome.allow']}
                  </button>
                )}
              </Row>
              <CollectionBackupControls
                refresh={() => Promise.resolve()}
                strings={strings}
              />
              <Row label={strings['settings.clearHistory']}>
                {confirm ? (
                  <div className="settings-confirm">
                    <span>{strings['settings.confirmClear']}</span>
                    <button type="button" onClick={() => setConfirm(false)}>
                      {strings['settings.cancel']}
                    </button>
                    <button type="button" onClick={() => void clear()}>
                      {strings['settings.clear']}
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setConfirm(true)}>
                    {strings['settings.clearHistory']}
                  </button>
                )}
              </Row>
            </div>
          </section>
        </fieldset>
        <p role="status">
          {status || (error ? strings['card.savedFailed'] : '')}
        </p>
      </div>
    </main>
  );
}
