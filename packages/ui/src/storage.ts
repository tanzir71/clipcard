import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';
import type { CardDraft } from './draft.ts';

interface ClipcardDB extends DBSchema {
  cards: { key: string; value: CardDraft; indexes: { updatedAt: number } };
}

let connection: Promise<IDBPDatabase<ClipcardDB>> | undefined;
function database() {
  connection ??= openDB<ClipcardDB>('clipcard', 1, {
    upgrade(db) {
      db.createObjectStore('cards', { keyPath: 'id' }).createIndex(
        'updatedAt',
        'updatedAt',
      );
    },
    blocking() {
      void connection?.then((db) => db.close());
      connection = undefined;
    },
    terminated() {
      connection = undefined;
    },
  }).catch((error: unknown) => {
    connection = undefined;
    throw error;
  });
  return connection;
}

export async function saveDraft(draft: CardDraft): Promise<CardDraft> {
  const db = await database();
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
  return (await database()).get('cards', id);
}

export async function recentDrafts() {
  const entries = await (
    await database()
  ).getAllFromIndex('cards', 'updatedAt');
  return entries.reverse();
}

export async function deleteDraft(id: string) {
  await (await database()).delete('cards', id);
}

export async function clearDrafts() {
  await (await database()).clear('cards');
}
