'use strict';

var log = require('utils/log');

module.exports = function(collectionName, collection, error) {
  log.error(collectionName + ' faye connection error', error);
};
