import type { GridClip } from '@clipcard/cards/grid-model';
import { readClipMedia } from './collections.ts';
import type { DraftCollection } from './collections.ts';

export function gridClipsForCollection(
  { draft, clips }: DraftCollection,
  imageUrl: (blob: Blob) => string | undefined,
) {
  return Promise.all(
    clips.map(async (clip): Promise<GridClip> => {
      const { id, kind, sourceUrl, title, text, outlet, publishedAt } = clip;
      const blob =
        id === 'legacy:' + draft.id && draft.legacyCard?.photo
          ? draft.legacyCard.photo.blob
          : await readClipMedia(clip);
      return {
        id,
        sourceUrl,
        title,
        text,
        outlet,
        publishedAt,
        image: blob ? imageUrl(blob) : undefined,
        kind:
          kind === 'video' || kind === 'library' || kind === 'gif'
            ? 'link'
            : kind,
      };
    }),
  );
}
