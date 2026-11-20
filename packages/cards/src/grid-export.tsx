import { prepareGridAssets } from './assets.ts';
import { GridCard } from './components/GridCard.tsx';
import type { GridModel, GridOptions } from './grid-model.ts';
import { renderArtwork } from './render-artwork.tsx';
import { tokens } from './tokens.ts';

export async function renderGrid(
  model: GridModel,
  options: GridOptions,
  { chromiumOffscreen = false }: { chromiumOffscreen?: boolean } = {},
): Promise<Blob> {
  const assets = await prepareGridAssets(model);
  const [width, height] = tokens.card.formats[options.format];
  return renderArtwork(
    <GridCard model={model} options={options} assets={assets} />,
    width,
    height,
    assets.fontCss,
    chromiumOffscreen,
  );
}
