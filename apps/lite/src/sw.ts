/// <reference lib="webworker" />
import { createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';
import { draftFromInput } from '@clipcard/ui/input';
import { FLAGS } from '@clipcard/core/flags';
import { appendCardDraft } from '@clipcard/ui/collection-card';
import { saveDraft } from '@clipcard/ui/storage';
import strings from '@clipcard/i18n/en';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Parameters<typeof precacheAndRoute>[0];
};

const scope = new URL(self.registration.scope);
const sharePath = new URL('share/', scope).pathname;
precacheAndRoute(self.__WB_MANIFEST);
registerRoute(
  new NavigationRoute(
    createHandlerBoundToURL(new URL('index.html', scope).href),
  ),
);
if (FLAGS.languages) {
  registerRoute(
    ({ sameOrigin, url }) =>
      sameOrigin &&
      url.pathname.startsWith(scope.pathname + 'assets/') &&
      url.pathname.endsWith('.woff2'),
    new CacheFirst({ cacheName: 'clipcard-script-fonts' }),
  );
}

self.addEventListener('install', () => void self.skipWaiting());
self.addEventListener('activate', (event) =>
  event.waitUntil(self.clients.claim()),
);

registerRoute(
  ({ url }) => url.pathname === sharePath,
  async ({ request }) => {
    const destination = new URL(scope);
    try {
      if (Number(request.headers.get('content-length')) > 20_000_000)
        throw new Error('Share too large');
      const data = await request.formData();
      const text = String(data.get('text') ?? '').slice(0, 20_000);
      const title = String(data.get('title') ?? '').slice(0, 120);
      const file = data.get('photo');
      const uri =
        String(data.get('url') ?? '') ||
        text.match(/https?:\/\/[^\s<>"']+/)?.[0];
      const draft = await draftFromInput(
        { text, title, uri, file: file instanceof File ? file : null },
        strings['card.photo'],
      );
      if (!draft) throw new Error('Unsupported share input');
      if (FLAGS.drafts && FLAGS.clips) {
        const collection = await appendCardDraft(draft);
        if (collection.draft.mode === 'card') {
          await saveDraft({ ...draft, id: collection.draft.id });
        }
        destination.searchParams.set('collection', collection.draft.id);
      } else {
        await saveDraft(draft);
        destination.searchParams.set('draft', draft.id);
      }
      destination.searchParams.set('from', 'share');
    } catch {
      destination.searchParams.set('from', 'share-error');
    }
    return Response.redirect(destination.href, 303);
  },
  'POST',
);
