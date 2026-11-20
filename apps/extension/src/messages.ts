import type { CardSource } from '@clipcard/core';
import type { Format, Template } from '@clipcard/cards';
import type { CardDraft, Overrides } from '@clipcard/ui';

export const bridgeScript = '/content-scripts/bridge.js';

export interface Hints {
  source: CardSource | null;
  title: string;
  image: string | null;
  imageWidth: number;
  selection: string;
  address: string;
  referrer: string;
  hoveredLink: string | null;
}

export interface Destination {
  name: NonNullable<CardDraft['destination']>;
  format: Format;
}

export type SitePrefs = Pick<Overrides, 'format' | 'template' | 'theme'>;

export interface SourceRequest {
  address: string;
  hints: Hints | null;
  selection?: string;
  canFetch: boolean;
  destination?: Destination;
}

export interface MadeCard {
  id: string;
  collectionId?: string;
  url: string;
  dir: 'ltr' | 'rtl';
  template: Template;
  format: Format;
  png?: string;
  thumb?: string;
  fallback: boolean;
}

export interface ClipCapture {
  kind: 'text' | 'image' | 'section';
  text?: string;
  image?: string;
  rect?: {
    x: number;
    y: number;
    width: number;
    height: number;
    viewport: number;
  };
}

export interface ClipTray {
  id: string;
  count: number;
  sources: number;
  thumbnails: Array<{ kind: string; image?: string }>;
}

export type OffscreenMessage =
  | { to: 'offscreen'; kind: 'make'; source: SourceRequest; render: boolean }
  | { to: 'offscreen'; kind: 'resolve'; address: string };

export type BridgeMessage =
  | { to: 'bridge'; kind: 'hints'; address?: string }
  | { to: 'bridge'; kind: 'card'; card: MadeCard; offerPermission: boolean }
  | { to: 'bridge'; kind: 'link'; url: string }
  | { to: 'bridge'; kind: 'error' }
  | {
      to: 'bridge';
      kind: 'open';
      id?: string;
      share?: boolean;
      collection?: string;
      drafts?: boolean;
    }
  | { to: 'bridge'; kind: 'startClipping' }
  | { to: 'bridge'; kind: 'contextImage'; address?: string }
  | { to: 'bridge'; kind: 'tray'; tray: ClipTray };

export type BackgroundMessage =
  | {
      to: 'background';
      kind: 'open';
      id: string;
      share?: boolean;
      collection?: string;
    }
  | { to: 'background'; kind: 'allowPhotos' }
  | { to: 'background'; kind: 'paste'; address: string }
  | { to: 'background'; kind: 'remember'; id: string }
  | { to: 'background'; kind: 'sitePrefs'; address: string }
  | { to: 'background'; kind: 'releaseUpdate' }
  | { to: 'background'; kind: 'captureClip'; capture: ClipCapture }
  | { to: 'background'; kind: 'openCollection'; id: string }
  | { to: 'background'; kind: 'pageCard' }
  | { to: 'background'; kind: 'addPage' }
  | { to: 'background'; kind: 'previewLink'; address: string }
  | { to: 'background'; kind: 'copyQuote'; text: string }
  | { to: 'background'; kind: 'offscreenIdle' };

export function forTarget(
  value: unknown,
  target: 'offscreen',
): value is OffscreenMessage;
export function forTarget(
  value: unknown,
  target: 'bridge',
): value is BridgeMessage;
export function forTarget(
  value: unknown,
  target: 'background',
): value is BackgroundMessage;
export function forTarget(value: unknown, target: string) {
  return (
    typeof value === 'object' &&
    value !== null &&
    'to' in value &&
    value.to === target &&
    'kind' in value &&
    typeof value.kind === 'string'
  );
}
