'use strict';

var Promise = require('bluebird');

function uninstall() {
  var Uint8Array = window.Uint8Array;
  var ServiceWorkerRegistration = window.ServiceWorkerRegistration;

  // Does this browser support Web Push?
  if (!Uint8Array ||
      !('serviceWorker' in navigator) ||
      !ServiceWorkerRegistration ||
      !('pushManager' in ServiceWorkerRegistration.prototype)) {
    return false;
  }

  if (!navigator.serviceWorker.controller) return false;

  return Promise.resolve(navigator.serviceWorker.ready)
    .then(function(registration) {
      if (!registration) return false;
      return registration.pushManager.getSubscription();
    })
    .then(function(subscription) {
      if (!subscription) return false;
      return subscription.unsubscribe();
    });
}

module.exports = {
  uninstall: Promise.method(uninstall)
};
