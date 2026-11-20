import { Card } from './components/Card.tsx';
import { prepareCardAssets } from './assets.ts';
import type { CardModel, CardOptions } from './model.ts';
import { renderArtwork } from './render-artwork.tsx';
import { tokens } from './tokens.ts';

export async function renderCard(
  model: CardModel,
  options: CardOptions,
  { chromiumOffscreen = false }: { chromiumOffscreen?: boolean } = {},
): Promise<Blob> {
  const [width, height] = tokens.card.formats[options.format];
  const assets = await prepareCardAssets(options.template);
  return renderArtwork(
    <Card model={model} options={options} assets={assets} />,
    width,
    height,
    assets.fontCss,
    chromiumOffscreen,
  );
}
