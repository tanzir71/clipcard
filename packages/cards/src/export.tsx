import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { domToBlob, domToCanvas } from 'modern-screenshot';
import { prepareCardAssets } from './assets.ts';
import { Card } from './components/Card.tsx';
import type { CardModel, CardOptions } from './model.ts';
import { tokens } from './tokens.ts';

export async function renderCard(
  model: CardModel,
  options: CardOptions,
  { chromiumOffscreen = false }: { chromiumOffscreen?: boolean } = {},
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
    await document.fonts.ready;

    const capture = {
      width,
      height,
      scale: 1,
      timeout: 8000,
      font: { cssText: assets.fontCss },
    };
    let result: Blob | null;
    if (chromiumOffscreen) {
      const canvas = await domToCanvas(card, {
        ...capture,
        features: { fixSvgXmlDecode: false },
      });
      // Async PNG encoding is throttled in Chromium's hidden documents.
      const encoded = canvas.toDataURL('image/png').split(',')[1];
      if (!encoded) throw new Error('Card PNG could not be encoded');
      const binary = atob(encoded);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < bytes.length; index++) {
        bytes[index] = binary.charCodeAt(index);
      }
      result = new Blob([bytes], { type: 'image/png' });
    } else {
      result = await domToBlob(card, { ...capture, type: 'image/png' });
    }
    if (!result || result.size === 0)
      throw new Error('Card PNG could not be encoded');
    return result;
  } finally {
    root.unmount();
    host.remove();
  }
}
