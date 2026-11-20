import { cardDatabase } from './storage-db.ts';
import type { CardDraft } from './draft.ts';

export async function saveDraft(draft: CardDraft): Promise<CardDraft> {
  const db = await cardDatabase();
  const tx = db.transaction('cards', 'readwrite');
  const updated = { ...draft, updatedAt: Date.now() };
  await tx.store.put(updated);
  const ids = await tx.store.index('updatedAt').getAllKeys();
  const overflow = ids.length - 30;
  if (overflow > 0) {
    await Promise.all(
      ids
        .filter((id) => id !== draft.id)
        .slice(0, overflow)
        .map((id) => tx.store.delete(id)),
    );
  }
  await tx.done;
  return updated;
}

export async function getDraft(id: string) {
  return (await cardDatabase()).get('cards', id);
}

export async function recentDrafts() {
  const entries = await (
    await cardDatabase()
  ).getAllFromIndex('cards', 'updatedAt');
  return entries.reverse();
}

export async function deleteDraft(id: string) {
  await (await cardDatabase()).delete('cards', id);
}

export async function clearDrafts() {
  await (await cardDatabase()).clear('cards');
}
