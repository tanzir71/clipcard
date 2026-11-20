import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { domToBlob } from 'modern-screenshot';
import { prepareCardAssets } from './assets.ts';
import { Card } from './components/Card.tsx';
import type { CardModel, CardOptions } from './model.ts';
import { tokens } from './tokens.ts';

export async function renderCard(
  model: CardModel,
  options: CardOptions,
): Promise<Blob> {
  const [width, height] = tokens.card.formats[options.format];
  const assets = await prepareCardAssets(options.template);
  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.inert = true;
  host.style.cssText =
    'position:fixed;top:0;left:-' + width + 'px;pointer-events:none;';
  document.body.append(host);
  const root = createRoot(host);

  try {
    flushSync(() =>
      root.render(<Card model={model} options={options} assets={assets} />),
    );
    const card = host.querySelector('article');
    if (!card) throw new Error('Card could not be mounted');
    await Promise.all(
      [...card.querySelectorAll('img')].map((image) => image.decode()),
    );
    await document.fonts.ready;

    const result = await domToBlob(card, {
      width,
      height,
      scale: 1,
      type: 'image/png',
      timeout: 8000,
      font: { cssText: assets.fontCss },
    });
    if (!result || result.size === 0)
      throw new Error('Card PNG could not be encoded');
    return result;
  } finally {
    root.unmount();
    host.remove();
  }
}
