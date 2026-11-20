import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { CardPreview } from '@clipcard/ui/card-preview';
import type { Format, Template } from '@clipcard/cards';
import { samples } from '../../../packages/cards/gallery/samples.ts';

const roots = new WeakMap<HTMLElement, Root>();
const primarySamples = new Map(
  samples
    .filter((sample) => sample.format === '4:5')
    .map((sample) => [sample.template, sample.model]),
);

export function renderDemo(demo: HTMLElement, format: Format) {
  for (const host of demo.querySelectorAll<HTMLElement>('[data-demo-card]')) {
    const template = host.dataset.demoCard as Template;
    const model = primarySamples.get(template);
    if (!model) continue;
    let root = roots.get(host);
    if (!root) {
      root = createRoot(host);
      roots.set(host, root);
    }
    root.render(<CardPreview model={model} options={{ template, format }} />);
  }
}
