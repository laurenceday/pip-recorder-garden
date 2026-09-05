const CACHE_NAME = 'pip-recorder-garden-v2';
const APP_ROOT = new URL('./', self.location.href);

async function cacheBuild() {
  const cache = await caches.open(CACHE_NAME);
  const page = await fetch(APP_ROOT.href, { cache: 'reload', redirect: 'error' });
  if (!page.ok) throw new Error('app shell unavailable');
  await cache.put(APP_ROOT.href, page.clone());
  const html = await page.text();
  const references = [...html.matchAll(/(?:src|href)="\.\/([^"#?]+)"/g)]
    .map((match) => new URL(match[1], APP_ROOT))
    .filter((url) => url.origin === APP_ROOT.origin && url.pathname.startsWith(APP_ROOT.pathname))
    .map((url) => url.href);
  await cache.addAll([...new Set(references)]);
}

self.addEventListener('install', (event) => {
  event.waitUntil(cacheBuild());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys()
    .then((names) => Promise.all(names.filter((name) => name.startsWith('pip-recorder-garden-') && name !== CACHE_NAME).map((name) => caches.delete(name))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== APP_ROOT.origin || !url.pathname.startsWith(APP_ROOT.pathname)) return;
  event.respondWith(caches.match(request).then(async (cached) => {
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response.ok && response.type === 'basic') {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }
      return response;
    } catch (error) {
      if (request.mode === 'navigate') return caches.match(APP_ROOT.href);
      throw error;
    }
  }));
});
