'use strict';

var log = require('utils/log');
var appEvents = require('utils/appevents');

module.exports = function(collectionName, collection, error) {
  appEvents.trigger('stats.event', 'live.collection.error');
  appEvents.trigger('stats.event', 'live.collection.error.' + collectionName);
  log.error(collectionName + ' live collection error', error);
};
