import type { GridClip } from '@clipcard/cards/grid-model';
import { readClipMedia } from './collections.ts';
import type { DraftCollection } from './collections.ts';

export function gridClipsForCollection(
  { draft, clips }: DraftCollection,
  imageUrl: (blob: Blob) => string | undefined,
) {
  return Promise.all(
    clips.map(async (clip): Promise<GridClip> => {
      const { id, kind, sourceUrl, title, text, outlet, lang, publishedAt } =
        clip;
      const poster = clip.video?.poster;
      const blob =
        kind === 'video'
          ? undefined
          : id === 'legacy:' + draft.id && draft.legacyCard?.photo
            ? draft.legacyCard.photo.blob
            : await readClipMedia(clip);
      return {
        id,
        sourceUrl,
        title,
        text,
        outlet,
        lang,
        publishedAt,
        image:
          poster ??
          (blob?.type.startsWith('image/') ? imageUrl(blob) : undefined),
        kind:
          kind === 'video' || kind === 'library' || kind === 'gif'
            ? 'link'
            : kind,
      };
    }),
  );
}
