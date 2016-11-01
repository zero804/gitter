'use strict';

var pushHandler = require('./push-handler');

function extractPayload(event) {
  try {
    return event && event.data && event.data.json();
  } catch(e) {
    return;
  }
}

self.addEventListener('push', function(event) {
  var payload = extractPayload(event);
  if (!payload) return;

  var promise = pushHandler(event, payload);
  if (promise) {
    event.waitUntil(promise);
  }
});

self.addEventListener('pushsubscriptionchange', function(/*event*/) {
  // TODO: important: implement this
})

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  if (event.notification.data && event.notification.data.url) {
    var clickResponsePromise = clients.openWindow(event.notification.data.url);
    event.waitUntil(clickResponsePromise);
  }

});

self.addEventListener('notificationclose', function(/*event*/) {
  // Do we want to do something here?
});
