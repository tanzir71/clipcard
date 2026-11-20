import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase, OpenDBCallbacks } from 'idb';
import type { ClipDraft, DraftClip, LibraryItem } from './collection-types.ts';
import type { CardDraft } from './draft.ts';

interface ClipcardDB extends DBSchema {
  cards: { key: string; value: CardDraft; indexes: { updatedAt: number } };
  drafts: { key: string; value: ClipDraft; indexes: { updatedAt: number } };
  clips: { key: string; value: DraftClip; indexes: { draftId: string } };
  library: { key: string; value: LibraryItem };
  expiredMedia: { key: string; value: string };
  prefs: {
    key: 'currentDraftId' | 'retention';
    value: string;
  };
}

export type Upgrade = NonNullable<OpenDBCallbacks<ClipcardDB>['upgrade']>;

export type Connection = Promise<IDBPDatabase<ClipcardDB>>;
let cardConnection: Connection | undefined;
let collectionConnection: Connection | undefined;

function connect(version?: number, upgrade?: Upgrade): Connection {
  function forget() {
    if (cardConnection === request) cardConnection = undefined;
    if (collectionConnection === request) collectionConnection = undefined;
  }

  const request = openDB<ClipcardDB>('clipcard', version, {
    upgrade(db, installedVersion, newVersion, transaction, event) {
      if (installedVersion === 0) {
        db.createObjectStore('cards', { keyPath: 'id' }).createIndex(
          'updatedAt',
          'updatedAt',
        );
      }
      upgrade?.(db, installedVersion, newVersion, transaction, event);
    },
    blocking() {
      forget();
      void request.then((db) => db.close());
    },
    terminated: forget,
  }).catch((error: unknown) => {
    forget();
    throw error;
  });
  return request;
}

export function cardDatabase(): Connection {
  return collectionConnection ?? (cardConnection ??= connect());
}

export function connectCollections(upgrade: Upgrade): Connection {
  return (collectionConnection ??= connect(2, upgrade));
}
