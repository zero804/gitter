'use strict';

var Promise = require('bluebird');
var clientEnv = require('gitter-client-env');
var supportsWebPush = require('./supports-web-push');

function install(options) {
  var apiClient = options.apiClient;

  var Uint8Array = window.Uint8Array;

  if (!supportsWebPush()) {
    return Promise.reject('ServiceWorker not available');
  }

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

  return Promise.resolve(navigator.serviceWorker.register('/sw.js', { scope: '/' }))
    .then(function(registration) {
      // TODO: figure out the rules for agent updating the service worker
      // registration.update();

      const serviceWorker = registration.installing || registration.waiting || registration.active;

      let whenRegistrationActive = Promise.resolve(registration);
      if(!registration.active || registration.active.state !== 'activated') {
        whenRegistrationActive = new Promise((resolve) => {
          serviceWorker.addEventListener('statechange', function(e) {
            if (e.target.state === 'activated') {
              resolve(registration);
            }
          });
        });
      }

      return whenRegistrationActive;
    })
    .then((activeRegistration) => {
      var vapidPublicKey = clientEnv.vapidAppServerKey;
      var convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

      const subscription = activeRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });

      return subscription;
    })
    .then((subscription) => {
      return apiClient.priv.post('/vapid', subscription);
    });
}

module.exports = {
  install: install
};
