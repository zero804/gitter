'use strict';

self.addEventListener('push', function(event) {
  var notificationTitle = 'Hello';
  var notificationOptions = {
    body: 'Thanks for sending this push msg.',
    icon: './images/logo-192x192.png',
    badge: './images/badge-72x72.png',
    tag: 'simple-push-demo-notification',
    data: {
      url: 'https://developers.google.com/web/fundamentals/getting-started/push-notifications/',
    },
  };

  if (event.data) {
    var dataText = event.data.text();
    notificationTitle = 'Received Payload';
    notificationOptions.body = "Push data: " + dataText;
  }

  var notificationPromise = self.registration.showNotification(notificationTitle, notificationOptions);
  event.waitUntil(notificationPromise);
});

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
