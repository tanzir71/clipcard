import { dirFor } from '@clipcard/core';
import type { CSSProperties } from 'react';
import { prepareGridAssets } from './assets.ts';
import type { CardAssets } from './assets.ts';
import { gridModel } from './grid-model.ts';
import type { GridClip } from './grid-model.ts';
import { renderArtwork } from './render-artwork.tsx';
import { typefaceFor } from './typefaces.ts';
import { Qr } from './components/Qr.tsx';
import './roundup.css';

export interface RoundupModel {
  lead: string;
  count: string;
  date: string;
  lang: string;
  mark: string;
  clips: GridClip[];
  offset: number;
}

export function prepareRoundup(model: RoundupModel) {
  return prepareGridAssets(
    gridModel(model.clips, { headline: model.lead + ' ' + model.count }),
  );
}

export function RoundupCard({
  model,
  assets,
}: {
  model: RoundupModel;
  assets: CardAssets;
}) {
  const direction = dirFor(model.lang);
  return (
    <article
      className="cc-roundup"
      dir={direction}
      lang={model.lang}
      aria-label={model.lead + ' ' + model.count}
    >
      <span
        className="cc-roundup-grain"
        aria-hidden="true"
        style={{ backgroundImage: `url("${assets.grain}")` }}
      ></span>
      <span className="cc-roundup-echo" aria-hidden="true">
        {model.mark}
      </span>
      <header>
        <div className="cc-roundup-mark">{model.mark}</div>
        <h1>
          {model.lead}
          <strong>{model.count}</strong>
        </h1>
        <time>{model.date}</time>
      </header>
      <ol className="cc-roundup-rows">
        {model.clips.slice(0, 4).map((clip, index) => {
          const title = assets.converted.get(clip.title) ?? clip.title;
          const face = typefaceFor(title, clip.lang);
          const label =
            clip.outlet ??
            (clip.sourceUrl ? new URL(clip.sourceUrl).hostname : '');
          return (
            <li key={clip.id}>
              <span className="cc-roundup-num">
                {String(model.offset + index + 1).padStart(2, '0')}
              </span>
              <div
                className="cc-roundup-photo"
                aria-hidden="true"
                style={
                  clip.image
                    ? { backgroundImage: `url("${clip.image}")` }
                    : undefined
                }
              >
                {clip.image ? null : label.slice(0, 2).toLocaleUpperCase()}
              </div>
              <div className="cc-roundup-story" dir="auto">
                <strong
                  style={
                    face
                      ? ({
                          '--roundup-face': '"' + face.family + '"',
                          fontWeight: face.strong,
                        } as CSSProperties)
                      : undefined
                  }
                >
                  {title}
                </strong>
                <span>{label}</span>
              </div>
              {clip.sourceUrl ? (
                <div className="cc-roundup-source">
                  <Qr url={clip.sourceUrl} size={84} minModulePx={2} />
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </article>
  );
}

export async function renderRoundup(model: RoundupModel) {
  const assets = await prepareRoundup(model);
  return renderArtwork(
    <RoundupCard model={model} assets={assets} />,
    1080,
    1350,
    assets.fontCss,
    false,
  );
}
