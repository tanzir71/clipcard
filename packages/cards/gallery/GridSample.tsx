import { useEffect, useState } from 'react';
import strings from '@clipcard/i18n/en';
import { prepareGridAssets } from '../src/assets.ts';
import type { CardAssets } from '../src/assets.ts';
import { GridCard } from '../src/components/GridCard.tsx';
import { renderGrid } from '../src/grid-export.tsx';
import type { GridModel, GridOptions } from '../src/grid-model.ts';
import { tokens } from '../src/tokens.ts';

const options: GridOptions = { format: '4:5' };

export function GridSample({ id, model }: { id: string; model: GridModel }) {
  const [assets, setAssets] = useState<CardAssets | null>(null);
  const [error, setError] = useState(false);
  const [width, height] = tokens.card.formats['4:5'];
  const previewWidth = 230;
  const scale = previewWidth / width;

  useEffect(() => {
    prepareGridAssets(model)
      .then(setAssets)
      .catch(() => setError(true));
  }, [model]);

  async function download() {
    try {
      const png = await renderGrid(model, options);
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
            <GridCard model={model} options={options} assets={assets} />
          </div>
        ) : null}
      </div>
      <figcaption>
        {strings[('grid.layout.' + model.layout) as keyof typeof strings]} ·{' '}
        {options.format}
      </figcaption>
      <button type="button" onClick={download} disabled={!assets}>
        {strings['share.download']}
      </button>
      {error ? <span role="alert">{strings['card.renderFailed']}</span> : null}
    </figure>
  );
}
