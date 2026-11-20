import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import strings from '@clipcard/i18n/en';
import { prepareCardAssets } from '../src/assets.ts';
import type { CardAssets } from '../src/assets.ts';
import { Card } from '../src/components/Card.tsx';
import { renderCard } from '../src/export.tsx';
import { tokens } from '../src/tokens.ts';
import { samples } from './samples.ts';
import { GridSample } from './GridSample.tsx';
import { gridSamples } from './grid-samples.ts';
import './style.css';

function Sample({ sample }: { sample: (typeof samples)[number] }) {
  const { id, template, format, model } = sample;
  const [assets, setAssets] = useState<CardAssets | null>(null);
  const [error, setError] = useState(false);
  const [width, height] = tokens.card.formats[format];
  const previewWidth = 230;
  const scale = previewWidth / width;

  useEffect(() => {
    prepareCardAssets(template)
      .then(setAssets)
      .catch(() => setError(true));
  }, [template]);

  async function download() {
    try {
      const png = await renderCard(model, { format, template });
      const url = URL.createObjectURL(png);
      const link = document.createElement('a');
      link.href = url;
      link.download = id + '.png';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 3000);
    } catch (error) {
      console.error(error);
      setError(true);
    }
  }

  return (
    <figure data-sample={id}>
      <div
        className="preview"
        style={{ width: previewWidth, height: height * scale }}
      >
        {assets ? (
          <div style={{ transform: 'scale(' + scale + ')' }}>
            <Card
              model={model}
              options={{ format, template }}
              assets={assets}
            />
          </div>
        ) : null}
      </div>
      <figcaption>
        {strings[('template.' + template) as keyof typeof strings]} · {format}
      </figcaption>
      <button type="button" onClick={download} disabled={!assets}>
        {strings['share.download']}
      </button>
      {error ? <span role="alert">{strings['card.renderFailed']}</span> : null}
    </figure>
  );
}

const root = document.getElementById('root');
if (root)
  createRoot(root).render(
    <main>
      <h1>{strings['ext.shortName']}</h1>
      <div className="gallery">
        {samples.map((sample) => (
          <Sample key={sample.id} sample={sample} />
        ))}
        {gridSamples.map((sample) => (
          <GridSample key={sample.id} {...sample} />
        ))}
      </div>
    </main>,
  );
