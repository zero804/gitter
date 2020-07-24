'use strict';

const log = require('./log');
const handler = require('./handler');

var idSeq = 0;

function extractPayload(event) {
  try {
    var data = event && event.data && event.data.json();
    if (!data) return;

    data.uniqueId = ++idSeq + ':' + Date.now();
    return data;
  } catch (e) {
    return;
  }
}

self.addEventListener('push', function(event) {
  var payload = extractPayload(event);
  if (!payload) return;

  var promise = handler.onPush(event, payload);
  if (promise) {
    event.waitUntil(promise);
  }
});

self.addEventListener('pushsubscriptionchange', function(/*event*/) {
  // TODO: important: implement this
});

self.addEventListener('notificationclick', function(event) {
  var promise = handler.onNotificationClick(event);
  if (promise) {
    event.waitUntil(promise);
  }
});

self.addEventListener('notificationclose', function(/*event*/) {
  // Do we want to do something here?
});

const clientEnv = GITTER_CLIENT_ENV;

// GITTER_ASSET_TAG is a global defined in the webpack config
const CURRENT_CACHE_NAME = clientEnv.assetTag;
log('CURRENT_CACHE_NAME', CURRENT_CACHE_NAME);

self.addEventListener('activate', function(event) {
  log('activate');
  event.waitUntil(
    (async () => {
      const cacheKeys = await caches.keys();
      cacheKeys.forEach(cacheKey => {
        if (cacheKey !== CURRENT_CACHE_NAME) {
          log('Deleting cache', cacheKey);
          caches.delete(cacheKey);
        }
      });
    })()
  );
});

self.addEventListener('fetch', async event => {
  if (event.request.method.toLowerCase() !== 'get') {
    return;
  }

  const isCdnAsset = clientEnv.cdns.some(cdn => {
    return new RegExp(`^(https?:)?//${cdn}`).test(event.request.url);
  });

  const shouldCacheThisFileType = /.(js|css)$/.test(event.request.url);

  if (!isCdnAsset || !shouldCacheThisFileType) {
    return;
  }

  event.respondWith(
    (async () => {
      const cacheResponse = await caches.match(event.request);
      // Cache hit - return response
      if (cacheResponse) {
        log('Using cache for', event.request.url);
        return cacheResponse;
      }

      const response = await fetch(event.request);
      const cache = await caches.open(CURRENT_CACHE_NAME);
      log('Caching', event.request.url);
      cache.put(event.request, response.clone());

      return response;
    })()
  );
});
