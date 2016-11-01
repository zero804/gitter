'use strict';

var Promise = require('bluebird');
var clientEnv = require('gitter-client-env');

function urlBase64ToUint8Array(base64String) {
  var padding = '='.repeat((4 - base64String.length % 4) % 4);
  var base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  var rawData = atob(base64);
  var outputArray = new Uint8Array(rawData.length);

  for (var i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}


function install(options) {
  var apiClient = options.apiClient;
  if ('serviceWorker' in navigator) {
    return Promise.resolve(navigator.serviceWorker.register('/_s/l/web-push/sw.js', { scope: '/' }))
      .then(function(registration) {
        var vapidPublicKey = clientEnv.vapidAppServerKey;
        var convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

        return registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey
        });
      })
      .then(function(subscription) {
        return apiClient.priv.post('/vapid', subscription);
      });

  } else {
    return Promise.reject('ServiceWorker not available')
  }
}

module.exports = {
  install: install
};
