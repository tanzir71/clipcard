import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { browser } from 'wxt/browser';
import { FLAGS } from '@clipcard/core/flags';
import { interfaceLanguages, languageName } from '@clipcard/i18n';
import { prepareCardAssets } from '@clipcard/cards/assets';
import { typefaceFor } from '@clipcard/cards/typefaces';
import type { CardModel } from '@clipcard/cards';
import { CardPreview } from '@clipcard/ui/card-preview';
import { Icon } from '@clipcard/ui';
import river from '../../../design/photos/river-bus.jpg?url';
import { SettingsBrand } from './settings-brand.tsx';
import { useUserSettings } from './use-user-settings.ts';
import './settings.css';
import './welcome-art.css';

const demo: Omit<CardModel, 'headline'> = {
  outlet: 'Delta Dispatch',
  image: river,
  sourceUrl: 'https://deltadispatch.news/city/electric-river-buses',
  qrUrl: 'https://deltadispatch.news/city/electric-river-buses',
  lang: 'en',
  script: 'latin',
  dir: 'ltr',
  focal: { x: 0.48, y: 0 },
  mark: 'Delta Dispatch',
};

const sampleHeadlines = {
  split: "Dhaka's new electric\nriver buses cut cross-\ncity commutes in half",
  overlay:
    "Dhaka's new\nelectric river\nbuses cut cross-\ncity commutes in\nhalf",
  caps: "Dhaka's new\nelectric river\nbuses cut\ncommutes\nin half",
};

function Welcome() {
  const { settings, strings, ready, error, change } = useUserSettings();
  const [allLanguages, setAllLanguages] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [problem, setProblem] = useState(false);
  const [handle, setHandle] = useState<string>();
  const shown = allLanguages
    ? interfaceLanguages
    : interfaceLanguages.slice(0, 8);

  useEffect(() => {
    void browser.permissions
      .contains({ origins: ['<all_urls>'] })
      .then(setAllowed, () => setProblem(true));
    void prepareCardAssets(
      'header',
      interfaceLanguages.map((lang) => typefaceFor(languageName(lang), lang)),
    ).catch(() => undefined);
  }, []);

  useEffect(() => {
    document.title = strings['welcome.title'];
  }, [strings]);

  async function allow() {
    try {
      setAllowed(
        await browser.permissions.request({ origins: ['<all_urls>'] }),
      );
    } catch {
      setProblem(true);
    }
  }

  async function complete() {
    try {
      if (handle !== undefined)
        await change('handle', handle.trim().replace(/^@+/, ''));
      window.close();
    } catch {
      setProblem(true);
    }
  }

  return (
    <main className="welcome-main">
      <section className="welcome-story" aria-labelledby="welcome-title">
        <SettingsBrand name={strings['ext.shortName']} />
        <h1 id="welcome-title">{strings['welcome.title']}</h1>
        <p>{strings['welcome.subtitle']}</p>
        <div className="welcome-fan" aria-hidden="true">
          {(['split', 'overlay', 'caps'] as const).map((template) => {
            const headline = sampleHeadlines[template];
            const caps = template === 'caps';
            return (
              <CardPreview
                key={template}
                model={{
                  ...demo,
                  headline,
                  emphasisRange: caps
                    ? [headline.length - 7, headline.length]
                    : undefined,
                }}
                options={{
                  template,
                  format: '4:5',
                  emphasis: caps ? 'box' : undefined,
                }}
              />
            );
          })}
        </div>
      </section>
      <form
        className="welcome-form"
        onSubmit={(event) => {
          event.preventDefault();
          void complete();
        }}
      >
        <fieldset>
          <legend>{strings['welcome.language']}</legend>
          <div className="welcome-language-chips">
            {shown.map((lang) => (
              <button
                key={lang}
                type="button"
                lang={lang}
                dir="auto"
                style={{
                  fontFamily: typefaceFor(languageName(lang), lang)?.family,
                }}
                aria-pressed={settings.interfaceLanguage === lang}
                disabled={!ready}
                onClick={() =>
                  void change('interfaceLanguage', lang).catch(() =>
                    setProblem(true),
                  )
                }
              >
                {languageName(lang)}
              </button>
            ))}
            {!allLanguages && (
              <button type="button" onClick={() => setAllLanguages(true)}>
                {strings['share.more']}
              </button>
            )}
          </div>
        </fieldset>
        <label className="welcome-handle">
          <span>{strings['welcome.handle']}</span>
          <input
            value={handle ?? settings.handle}
            onChange={(event) => setHandle(event.currentTarget.value)}
            maxLength={50}
            dir="ltr"
            placeholder={strings['welcome.handlePlaceholder']}
          />
        </label>
        <fieldset>
          <legend>{strings['welcome.permissionLabel']}</legend>
          <div className="welcome-permission">
            <span aria-hidden="true">
              <Icon name="shield" />
            </span>
            <div>
              <span>{strings['welcome.permission']}</span>
              <small>{strings['welcome.permissionSub']}</small>
            </div>
            {allowed ? (
              <span role="status" aria-label={strings['welcome.photosEnabled']}>
                ✓
              </span>
            ) : (
              <button type="button" onClick={() => void allow()}>
                {strings['welcome.allow']}
              </button>
            )}
          </div>
        </fieldset>
        <button className="settings-primary" type="submit" disabled={!ready}>
          {strings['welcome.done']}
        </button>
        {problem || error ? (
          <p role="alert">{strings['card.savedFailed']}</p>
        ) : null}
      </form>
    </main>
  );
}

const root = document.getElementById('root');
if (root && FLAGS.languages) createRoot(root).render(<Welcome />);
