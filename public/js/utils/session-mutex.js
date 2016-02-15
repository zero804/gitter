'use strict';

var Promise = require('bluebird');
var storage = window.localStorage;

var TIMEOUT = 60000;
var uniq = Math.floor(Math.random() * 10000000);

function garbageCollection() {
  var now = Date.now();

  for (var i = storage.length; i >= 0; i--) {
    var key = storage.key(i);
    if (key && key.indexOf('lock:') === 0) {
      var value = storage.getItem(key);
      if (value) {
        var pair = value.split('-');
        var lockDate =  parseInt(pair[0], 10);

        if (lockDate && (now - lockDate > TIMEOUT)) {
          storage.removeItem(key);
        }
      }
    }
  }
}

setInterval(garbageCollection, 60000);

var sessionMutex = Promise.method(function (key) {
  var storageKey = 'lock:' + key;

  var k = storage.getItem(storageKey);
  if (k) {
    return false;
  }

  var value = Date.now() + ':' + uniq;

  storage.setItem(storageKey, value);
  return Promise.delay(16)
    .then(function() {
      if (storage.getItem(storageKey) === value) {
        Promise.delay(10000).then(function() {
          storage.removeItem('lock:' + key);
        });

        return true;
      }
    });
});

module.exports = sessionMutex;
window.sessionMutex = sessionMutex;
