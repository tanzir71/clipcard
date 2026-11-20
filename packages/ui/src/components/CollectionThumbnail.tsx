import { useEffect, useRef, useState } from 'react';
import { gridModel } from '@clipcard/cards/grid-model';
import { prepareGridAssets } from '@clipcard/cards/assets';
import { GridCard } from '@clipcard/cards/grid-view';
import type { ComponentProps } from 'react';
import { cardFromCollection } from '../collection-card.ts';
import { getDraftCollection } from '../collections.ts';
import type { ClipDraft } from '../collections.ts';
import type { CardDraft } from '../draft.ts';
import { gridClipsForCollection } from '../grid-clips.ts';
import { getDraft } from '../storage.ts';
import { DraftPreview } from './CardPreview.tsx';
import { Icon } from './Icon.tsx';

type Preview = { card: CardDraft } | { grid: ComponentProps<typeof GridCard> };

export function CollectionThumbnail({ draft }: { draft: ClipDraft }) {
  const element = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [preview, setPreview] = useState<Preview>();
  const { id, mode, updatedAt } = draft;

  useEffect(() => {
    const node = element.current;
    if (!node) return;
    let active = true;
    const urls: string[] = [];
    const measure = new ResizeObserver(([entry]) => {
      if (entry) setWidth(entry.contentRect.width);
    });
    measure.observe(node);
    async function load() {
      const collection = await getDraftCollection(id);
      if (!collection || !active) return;
      if (mode === 'grid') {
        const clips = await gridClipsForCollection(collection, (blob) => {
          if (!active) return undefined;
          const url = URL.createObjectURL(blob);
          urls.push(url);
          return url;
        });
        if (!active) return;
        const model = gridModel(clips, {
          headline: collection.draft.title,
          layout: collection.draft.gridLayout,
        });
        const assets = await prepareGridAssets(model);
        if (active)
          setPreview({
            grid: {
              model,
              options: {
                format: '4:5',
                theme: collection.draft.overrides.theme,
              },
              assets,
            },
          });
      } else {
        const card =
          (await getDraft(id)) ?? (await cardFromCollection(collection));
        if (card && active)
          setPreview({
            card: { ...card, overrides: { ...card.overrides, format: '4:5' } },
          });
      }
    }
    const watch = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      watch.disconnect();
      void load().catch(() => undefined);
    });
    watch.observe(node);
    return () => {
      active = false;
      watch.disconnect();
      measure.disconnect();
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [id, mode, updatedAt]);

  return (
    <div
      className="clip-preview clip-collection-thumbnail"
      aria-hidden="true"
      ref={element}
    >
      {preview && 'card' in preview ? (
        <DraftPreview draft={preview.card} />
      ) : preview && 'grid' in preview && width > 0 ? (
        <div
          className="clip-preview-scale"
          style={{ transform: 'scale(' + width / 1080 + ')' }}
        >
          <GridCard {...preview.grid} />
        </div>
      ) : (
        <Icon name={mode === 'grid' ? 'grid' : 'card'} />
      )}
    </div>
  );
}
