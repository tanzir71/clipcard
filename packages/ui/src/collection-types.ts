import type { TextRange } from '@clipcard/core';
import type { GridLayout } from '@clipcard/cards/grid-model';
import type { CardDraft, Overrides } from './draft.ts';

export interface ClipDraft {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  mode: 'card' | 'grid' | 'video';
  gridLayout?: GridLayout;
  overrides: Overrides;
  order: string[];
  legacyCard?: CardDraft;
}

export interface ClipInput {
  kind: 'link' | 'text' | 'image' | 'section' | 'video' | 'library' | 'gif';
  sourceUrl: string | null;
  title: string;
  outlet?: string;
  publishedAt?: string;
  text?: string;
  range?: TextRange;
  rect?: { x: number; y: number; width: number; height: number };
}

export interface StoredMedia {
  mediaKey?: string;
  mediaType?: string;
  embeddedMedia?: Blob;
}

export interface DraftClip extends ClipInput, StoredMedia {
  id: string;
  draftId: string;
  createdAt: number;
  textFragment?: string;
}

export interface LibraryItem extends StoredMedia {
  id: string;
  kind: DraftClip['kind'];
  tags: string[];
  favorite: boolean;
  sourceUrl: string | null;
  savedAt: number;
}

export interface DraftCollection {
  draft: ClipDraft;
  clips: DraftClip[];
}

export type Retention = '30-days' | 'forever';
