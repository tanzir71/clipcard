import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import strings from '@clipcard/i18n/en';
import type { CardDraft } from './draft.ts';
import { draftFromInput } from './input.ts';
import type { CardInput } from './input.ts';
import { CardPreview, useDraftArt } from './components/CardPreview.tsx';
import { CardActions } from './components/EditorControls.tsx';
import { saveDraft } from './storage.ts';

const roots = new WeakMap<HTMLElement, Root>();

function HeroOutput({ draft, appUrl }: { draft: CardDraft; appUrl: string }) {
  const { model, options } = useDraftArt(draft);
  const open = () => {
    const link = new URL(appUrl, location.href);
    link.searchParams.set('draft', draft.id);
    location.assign(link.href);
  };
  return (
    <div className="clip-hero-output">
      <CardPreview model={model} options={options} />
      <CardActions model={model} options={options} onOpen={open} />
    </div>
  );
}

export async function showHeroCard(
  host: HTMLElement,
  input: CardInput,
  appUrl: string,
) {
  const draft = await draftFromInput(input, strings['card.photo']);
  if (!draft) return false;
  await saveDraft(draft);
  if (!host.isConnected) return false;
  let root = roots.get(host);
  if (!root) {
    root = createRoot(host);
    roots.set(host, root);
  }
  root.render(<HeroOutput draft={draft} appUrl={appUrl} />);
  host.closest('.hero')?.classList.add('has-hero-result');
  host.scrollIntoView({ block: 'nearest', inline: 'center' });
  return true;
}
