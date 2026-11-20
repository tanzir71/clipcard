import { memo, useMemo } from 'react';
import type { CSSProperties } from 'react';
import strings from '@clipcard/i18n/en';
import type { CardAssets } from '../assets.ts';
import { guardText, INK, TEXT_COLORS, THEMES } from '../color.ts';
import type {
  CardModel,
  CardOptions,
  EmphasisStyle,
  Template,
} from '../model.ts';
import { qrGeometry } from '../qr.ts';
import { fade, halftone } from '../texture.ts';
import { tokens } from '../tokens.ts';
import { Headline } from './Headline.tsx';
import '../card.css';

export interface CardProps {
  model: CardModel;
  options: CardOptions;
  assets: CardAssets;
}

const typography = {
  header: { size: 48, line: 66, min: 33, lines: 3, family: 'Geist' },
  split: { size: 52, line: 70, min: 37, lines: 3, family: 'Libre Caslon Text' },
  overlay: {
    size: 56,
    line: 62,
    min: 38,
    lines: 4,
    family: 'Schibsted Grotesk',
  },
  solid: { size: 62, line: 82, min: 38, lines: 4, family: 'Libre Caslon Text' },
  quote: { size: 44, line: 60, min: 28, lines: 5, family: 'Libre Caslon Text' },
} as const;

const overallEmphasis: Record<Template, EmphasisStyle> = {
  header: 'box',
  split: 'line',
  overlay: 'color',
  solid: 'line',
  quote: 'line',
};

function photoStyle(model: CardModel) {
  return {
    backgroundImage: model.image
      ? 'url(' + JSON.stringify(model.image) + ')'
      : undefined,
    backgroundPosition:
      (model.focal?.x ?? 0.5) * 100 +
      '% ' +
      (model.focal?.y ?? 0.4) * 100 +
      '%',
  };
}

function Photo({ model, echo = false }: { model: CardModel; echo?: boolean }) {
  // Backgrounds keep DOM export independent of image decoding in hidden documents.
  return model.image ? (
    <div
      className={echo ? 'cc-echo' : 'cc-photo'}
      style={photoStyle(model)}
      aria-hidden="true"
    />
  ) : null;
}

function PhotoShade({
  height,
  color = INK,
  alpha,
  edge,
  hold,
}: {
  height: number;
  color?: string;
  alpha: number;
  edge: 'top' | 'bottom';
  hold?: number;
}) {
  const background = fade(
    color,
    alpha,
    edge === 'top' ? 'to bottom' : 'to top',
    hold,
  );
  return (
    <div
      className={
        edge === 'top' ? 'cc-shade cc-shade-top' : 'cc-shade cc-shade-foot'
      }
      style={{ height, background }}
    />
  );
}

function Grain({ assets }: { assets: CardAssets }) {
  return (
    <div
      className="cc-grain"
      style={{ backgroundImage: 'url("' + assets.grain + '")' }}
    />
  );
}

function Brand({
  mark,
  echo = false,
}: {
  mark?: string | null;
  echo?: boolean;
}) {
  if (!mark) return null;
  return echo ? (
    <div className="cc-oversized" aria-hidden="true">
      {mark.split(/[.\s]/)[0]}
    </div>
  ) : (
    <div className="cc-mark">{mark}</div>
  );
}

function Kicker({
  model,
  variant,
}: {
  model: CardModel;
  variant: 'panel' | 'chip' | 'quote';
}) {
  if (model.oldNewsYear) {
    const year = new Intl.NumberFormat(model.lang, {
      useGrouping: false,
    }).format(model.oldNewsYear);
    return <div className="cc-kicker cc-chip cc-year">{year}</div>;
  }
  if (variant === 'quote')
    return (
      <div className="cc-kicker cc-quote-kicker">
        {strings['card.quote']}{' '}
        {model.outlet ? <span>{model.outlet}</span> : null}
      </div>
    );
  if (!model.section) return null;
  return variant === 'panel' ? (
    <div className="cc-kicker cc-panel-kicker">
      {model.section}{' '}
      {model.subsection ? <span>{model.subsection}</span> : null}
    </div>
  ) : (
    <div className="cc-kicker cc-chip">{model.section}</div>
  );
}

function Meta({
  model,
  variant = 'mono',
}: {
  model: CardModel;
  variant?: 'mono' | 'panel' | 'overlay';
}) {
  let date = '';
  if (model.publishedAt) {
    const day = new Date(model.publishedAt.slice(0, 10) + 'T00:00:00Z');
    if (Number.isFinite(day.getTime())) {
      const locale = model.lang.startsWith('en') ? 'en-GB' : model.lang;
      date = new Intl.DateTimeFormat(locale, {
        timeZone: 'UTC',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(day);
    }
  }
  const panel = variant === 'panel';
  const source = model.outlet
    ? strings['card.source'] + (panel ? ' : ' : ': ') + model.outlet
    : '';
  const edited = model.edited ? strings['state.edited'] : '';
  const fields = panel
    ? [source, date, edited]
    : variant === 'overlay'
      ? [model.section, date, model.outlet, edited]
      : [date, source, edited];
  const text = fields
    .filter(Boolean)
    .join(panel ? '   |   ' : variant === 'overlay' ? '  ·  ' : '  |  ');
  return text ? (
    <div className={panel ? 'cc-meta cc-meta-panel' : 'cc-meta'}>{text}</div>
  ) : null;
}

const Qr = memo(function Qr({ url, size }: { url: string; size: number }) {
  const geometry = qrGeometry(url, size);
  return (
    <svg
      className="cc-qr"
      role="img"
      aria-label={strings['card.qr']}
      width={geometry.size}
      height={geometry.size}
      viewBox={'0 0 ' + geometry.size + ' ' + geometry.size}
      shapeRendering="crispEdges"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="100%" height="100%" fill="#fff" />
      <path fill={tokens.card.qr.dark} d={geometry.path} />
    </svg>
  );
});

export function Card({ model, options, assets }: CardProps) {
  const { format, template } = options;
  const [width, height] = tokens.card.formats[format];
  const story = format === '9:16';
  const top = story
    ? tokens.card.safeArea['9:16'].top
    : template === 'header'
      ? 50
      : 52;
  const bottom = story ? tokens.card.safeArea['9:16'].bottom : 56;
  const theme = options.theme ?? THEMES.midnight;
  const emphasis = options.emphasis ?? overallEmphasis[template];
  const background = template === 'solid' ? theme.deep : INK;
  const keyColor = options.keyColor ?? theme.light;
  const textColor = options.textColor ?? TEXT_COLORS.white;
  const typographyForTemplate = typography[template];
  const size = Math.round(
    typographyForTemplate.size * Math.min(width / 1080, 1),
  );
  const lineHeight = typographyForTemplate.line / typographyForTemplate.size;
  const lines = typographyForTemplate.lines - Number(format === '1:1');
  const qrBaseSize =
    template === 'header'
      ? tokens.card.qrSize.header
      : story
        ? tokens.card.qr.tile['9:16']
        : tokens.card.qrSize.default4x5;
  const headerHeight = Math.round(height * (story ? 588 / 1920 : 388 / 1350));
  const splitHeight = story
    ? height - bottom - 335
    : Math.round(height * 0.726);
  const guarded = guardText(
    template === 'overlay' ? (model.photoLight ?? 0.8) : 0.045,
    textColor,
    keyColor,
    emphasis,
    template === 'overlay' ? tokens.card.gradient.maxAlpha.overlayTextFoot : 1,
  );
  const overlayPlateau = story || guarded.shade > 0.86 ? bottom + 170 : 0;
  const overlayShade = Math.min(
    height,
    Math.max(920, overlayPlateau + height * 0.35),
  );
  const availableHeight =
    template === 'header'
      ? Math.max(94, headerHeight - top - 76)
      : template === 'split'
        ? Math.max(75, height - splitHeight - bottom - 72)
        : height * 0.32;
  const style = {
    width,
    height,
    color: guarded.text,
    backgroundColor: background,
    '--cc-family': '"' + typographyForTemplate.family + '"',
    '--cc-top': top + 'px',
    '--cc-bottom': bottom + 'px',
    '--cc-deep': background,
    '--cc-key': guarded.key,
    '--cc-meta-width': width - qrBaseSize - 56 * 2 - 60 + 'px',
  } as CSSProperties;
  const title = (
    <Headline
      title={model.headline}
      range={model.emphasisRange}
      emphasis={emphasis}
      keyColor={guarded.key}
      color={template === 'quote' ? INK : guarded.text}
      maxSize={size}
      minSize={Math.min(typographyForTemplate.min, size)}
      lines={lines}
      lineHeight={lineHeight}
      availableHeight={availableHeight}
      panel={template === 'header'}
    />
  );
  const thumbPattern = useMemo(
    () =>
      template === 'split'
        ? halftone(width, 380, 'down')
        : template === 'solid'
          ? halftone(Math.round(width * 0.7), 470, 'toward-start')
          : null,
    [template, width],
  );
  const halftoneStyle = thumbPattern
    ? { backgroundImage: 'url("' + thumbPattern + '")' }
    : undefined;

  return (
    <article
      className={'cc-card cc-' + template}
      data-format={format}
      lang={model.lang}
      dir={model.dir}
      aria-label={model.headline}
      style={style}
    >
      {template === 'header' ? (
        <>
          <div className="cc-photo-area" style={{ top: headerHeight }}>
            <Photo model={model} />
            <PhotoShade
              height={Math.max(500, (height - headerHeight) * 0.35)}
              edge="bottom"
              alpha={0.32}
            />
            <div className="cc-foot-grain">
              <Grain assets={assets} />
            </div>
          </div>
          <div className="cc-header-panel" style={{ height: headerHeight }}>
            <Photo model={model} echo />
            <Brand mark={model.mark} echo />
            <Grain assets={assets} />
            <div className="cc-header-content">
              <Kicker model={model} variant="panel" />
              {title}
              <Meta model={model} variant="panel" />
            </div>
          </div>
          <Brand mark={model.mark} />
        </>
      ) : template === 'split' ? (
        <>
          <div className="cc-photo-area" style={{ height: splitHeight }}>
            <Photo model={model} />
            <PhotoShade
              height={Math.max(420, splitHeight * 0.35)}
              edge="top"
              alpha={0.28}
            />
          </div>
          <div className="cc-split-panel" style={{ top: splitHeight }}>
            <div className="cc-halftone" style={halftoneStyle} />
            <Grain assets={assets} />
            <div className="cc-split-title">{title}</div>
          </div>
          <Brand mark={model.mark} />
          <Kicker model={model} variant="chip" />
          <Meta model={model} />
        </>
      ) : template === 'overlay' ? (
        <>
          <Photo model={model} />
          <PhotoShade
            height={Math.max(420, height * 0.35)}
            edge="top"
            alpha={0.25}
          />
          <PhotoShade
            height={overlayShade}
            edge="bottom"
            alpha={guarded.shade}
            hold={overlayPlateau / overlayShade}
          />
          <div className="cc-foot-grain" style={{ height: overlayShade * 0.7 }}>
            <Grain assets={assets} />
          </div>
          <Brand mark={model.mark} />
          {model.oldNewsYear ? <Kicker model={model} variant="chip" /> : null}
          <div className="cc-overlay-title">{title}</div>
          <Meta model={model} variant="overlay" />
        </>
      ) : template === 'quote' ? (
        <>
          <Photo model={model} echo />
          <Brand mark={model.mark} echo />
          <Grain assets={assets} />
          <Brand mark={model.mark} />
          <Kicker model={model} variant="quote" />
          <div className="cc-quote-content">
            {title}
            {model.quoteAttribution ? (
              <div className="cc-attribution">{model.quoteAttribution}</div>
            ) : null}
          </div>
          <Meta model={model} />
        </>
      ) : (
        <>
          <div className="cc-halftone" style={halftoneStyle} />
          <Brand mark={model.mark} echo />
          <Grain assets={assets} />
          <Brand mark={model.mark} />
          <Kicker model={model} variant="chip" />
          <div className="cc-solid-title">{title}</div>
          <Meta model={model} />
        </>
      )}
      {model.qrUrl ? <Qr url={model.qrUrl} size={qrBaseSize} /> : null}
    </article>
  );
}
