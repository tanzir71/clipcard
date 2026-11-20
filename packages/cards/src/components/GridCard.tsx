import type { CSSProperties } from 'react';
import type { CardAssets } from '../assets.ts';
import { THEMES } from '../color.ts';
import type {
  GridClip,
  GridModel,
  GridOptions,
  GridSource,
} from '../grid-model.ts';
import { tokens } from '../tokens.ts';
import { typefaceFor } from '../typefaces.ts';
import { Qr } from './Qr.tsx';
import '../card.css';
import '../grid.css';

const imageStyle = (image?: string) =>
  image ? { backgroundImage: 'url(' + JSON.stringify(image) + ')' } : undefined;

function ClipCell({
  clip,
  lang,
  assets,
}: {
  clip: GridClip;
  lang: string;
  assets: CardAssets;
}) {
  if (clip.image && clip.kind !== 'text') {
    return (
      <div
        className="cc-grid-image"
        data-section={clip.kind === 'section' || undefined}
        style={imageStyle(clip.image)}
        role="img"
        aria-label={clip.title}
      />
    );
  }
  const text = clip.text || clip.title;
  const language = clip.lang ?? lang;
  const face = typefaceFor(text, language);
  return (
    <div
      className="cc-grid-extract"
      data-quote={clip.kind === 'text' || undefined}
    >
      {clip.kind === 'text' ? <span aria-hidden="true">“</span> : null}
      <p
        dir="auto"
        lang={language}
        style={
          face && {
            fontFamily: '"' + face.family + '", "Libre Caslon Text", serif',
            fontWeight: face.weight,
            letterSpacing: 'normal',
          }
        }
      >
        {assets.converted.get(text) ?? text}
      </p>
    </div>
  );
}

function sourceMeta(clip?: GridClip, lang = 'en'): string {
  if (!clip) return '';
  const { publishedAt, outlet } = clip;
  const time = publishedAt ? Date.parse(publishedAt) : NaN;
  const date = !Number.isNaN(time)
    ? new Intl.DateTimeFormat(lang, {
        dateStyle: 'medium',
        timeZone: 'UTC',
      }).format(time)
    : '';
  return [date, outlet].filter(Boolean).join(' · ');
}

function SourceCell({
  source,
  lang,
  assets,
}: {
  source: GridSource;
  lang: string;
  assets: CardAssets;
}) {
  const [first] = source.clips;
  const meta = sourceMeta(first, lang);
  return (
    <div
      className="cc-grid-source"
      data-sourced={Boolean(source.qrUrl) || undefined}
    >
      <div className="cc-grid-source-items">
        {source.clips.map((clip) => (
          <ClipCell key={clip.id} clip={clip} assets={assets} lang={lang} />
        ))}
      </div>
      {meta ? <div className="cc-grid-source-meta">{meta}</div> : null}
      {source.year ? <Year value={source.year} lang={lang} /> : null}
      {source.qrUrl ? <Qr url={source.qrUrl} size={88} /> : null}
    </div>
  );
}

function Year({ value, lang }: { value: number; lang: string }) {
  return (
    <time className="cc-grid-year" dateTime={String(value)}>
      {new Intl.NumberFormat(lang, { useGrouping: false }).format(value)}
    </time>
  );
}

export function GridCard({
  model,
  options,
  assets,
}: {
  model: GridModel;
  options: GridOptions;
  assets: CardAssets;
}) {
  const { layout, clips, sources } = model;
  const face = typefaceFor(model.headline, model.lang);
  const { format, theme = THEMES.midnight } = options;
  const [width, height] = tokens.card.formats[format];
  const excerpt = layout === 'excerpts';
  const sourcesSeparate = sources.length > 1;
  const mainQr = sourcesSeparate ? null : (sources[0]?.qrUrl ?? null);
  const first = clips[0];
  const meta = sourcesSeparate ? '' : sourceMeta(first, model.lang);
  const year = sourcesSeparate ? null : sources[0]?.year;
  const style = {
    width,
    height,
    '--grid-deep': theme.deep,
    '--grid-light': theme.light,
    '--grid-grain': 'url(' + JSON.stringify(assets.grain) + ')',
    '--grid-bottom':
      format === '9:16' ? '340px' : width > height ? '48px' : '72px',
    '--grid-top': format === '9:16' ? '250px' : excerpt ? '72px' : '40px',
  } as CSSProperties;

  return (
    <article
      className="cc-card cc-grid"
      lang={model.lang}
      dir={model.dir}
      style={style}
      data-layout={layout}
      data-format={format}
      data-wide={width > height || undefined}
      data-multiple={sourcesSeparate || undefined}
    >
      {excerpt && model.background ? (
        <div
          className="cc-grid-background"
          style={imageStyle(model.background)}
        />
      ) : null}
      {excerpt ? (
        <div
          className="cc-grain"
          style={{ backgroundImage: 'var(--grid-grain)' }}
        />
      ) : null}
      {model.mark ? (
        <div className="cc-grid-mark">
          <span aria-hidden="true">{Array.from(model.mark)[0]}</span>
          {model.mark}
        </div>
      ) : null}
      {year ? <Year value={year} lang={model.lang} /> : null}
      <div
        className="cc-grid-content"
        data-count={sourcesSeparate ? sources.length : clips.length}
      >
        {sourcesSeparate
          ? sources.map((source) => (
              <SourceCell
                key={source.canonicalUrl ?? ''}
                source={source}
                lang={model.lang}
                assets={assets}
              />
            ))
          : clips.map((clip) => (
              <ClipCell
                key={clip.id}
                clip={clip}
                assets={assets}
                lang={model.lang}
              />
            ))}
      </div>
      <footer className="cc-grid-footer" data-qr={Boolean(mainQr) || undefined}>
        <p
          className="cc-grid-headline"
          style={
            face && {
              fontFamily: '"' + face.family + '", "Libre Caslon Text", serif',
              fontWeight: face.strong,
              letterSpacing: 'normal',
            }
          }
        >
          {assets.converted.get(model.headline) ?? model.headline}
        </p>
        {meta ? <p className="cc-grid-meta">{meta}</p> : null}
        {mainQr ? <Qr url={mainQr} size={128} minModulePx={2} /> : null}
      </footer>
    </article>
  );
}
