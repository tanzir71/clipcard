import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import strings from '@clipcard/i18n/en';
import { FLAGS } from '@clipcard/core/flags';
import { appendCardDraft } from './collection-card.ts';
import type { CardDraft } from './draft.ts';
import { draftFromInput } from './input.ts';
import type { CardInput } from './input.ts';
import { CardPreview, useDraftArt } from './components/CardPreview.tsx';
import { CardActions } from './components/EditorControls.tsx';
import { saveDraft } from './storage.ts';

const roots = new WeakMap<HTMLElement, Root>();

function HeroOutput({
  draft,
  appUrl,
  collectionId,
}: {
  draft: CardDraft;
  appUrl: string;
  collectionId?: string;
}) {
  const { model, options } = useDraftArt(draft);
  const open = () => {
    const link = new URL(appUrl, location.href);
    if (collectionId) link.searchParams.set('collection', collectionId);
    else link.searchParams.set('draft', draft.id);
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
  const collection =
    FLAGS.drafts && FLAGS.clips ? await appendCardDraft(draft) : undefined;
  if (!collection || collection.draft.mode === 'card') {
    await saveDraft(collection ? { ...draft, id: collection.draft.id } : draft);
  }
  if (!host.isConnected) return false;
  let root = roots.get(host);
  if (!root) {
    root = createRoot(host);
    roots.set(host, root);
  }
  root.render(
    <HeroOutput
      draft={draft}
      appUrl={appUrl}
      collectionId={collection?.draft.id}
    />,
  );
  host.closest('.hero')?.classList.add('has-hero-result');
  host.scrollIntoView({ block: 'nearest', inline: 'center' });
  return true;
}
