import type { CaptionCue, TextRange, VideoRange } from '@clipcard/core';
import type { GridLayout } from '@clipcard/cards/grid-model';
import type { CardDraft, Overrides } from './draft.ts';

export interface VideoOptions {
  format?: '9:16' | '4:5' | '16:9';
  captions?: boolean;
  reactionSkipped?: boolean;
}

export interface ClipDraft {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  mode: 'card' | 'grid' | 'video';
  gridLayout?: GridLayout;
  videoOptions?: VideoOptions;
  overrides: Overrides;
  order: string[];
  savedForLater?: boolean;
  legacyCard?: CardDraft;
}

export interface ClipVideo extends VideoRange {
  source: string | null;
  cues: CaptionCue[];
  poster?: string;
}

export interface ClipInput {
  kind: 'link' | 'text' | 'image' | 'section' | 'video' | 'library' | 'gif';
  sourceUrl: string | null;
  title: string;
  outlet?: string;
  lang?: string;
  publishedAt?: string;
  text?: string;
  range?: TextRange;
  video?: ClipVideo;
  trim?: VideoRange;
  fit?: 'contain' | 'cover';
  reaction?: boolean;
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
  title?: string;
  outlet?: string;
  lang?: string;
  video?: ClipVideo;
  sourceUrl: string | null;
  savedAt: number;
}

export interface DraftCollection {
  draft: ClipDraft;
  clips: DraftClip[];
}

export type Retention = '30-days' | 'forever';
