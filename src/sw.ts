/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';

declare let self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<unknown> };

self.skipWaiting();

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

clientsClaim();
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

const appShellHandler = createHandlerBoundToURL(`${import.meta.env.BASE_URL}index.html`);
registerRoute(new NavigationRoute(appShellHandler));

registerRoute(
  ({ url }) => url.pathname.endsWith('revision.json') || /trip\..*\.enc\.json$/.test(url.pathname) || url.pathname.endsWith('trip.enc.json'),
  new NetworkFirst({
    cacheName: 'honeymoon-content',
    networkTimeoutSeconds: 3
  })
);

registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({ cacheName: 'honeymoon-images' })
);

registerRoute(
  ({ request }) => request.destination === 'font' || request.destination === 'style' || request.destination === 'script',
  new StaleWhileRevalidate({ cacheName: 'honeymoon-assets' })
);
