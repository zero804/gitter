'use strict';

var Promise = require('bluebird');

function execPreloads(preloads, callback) {
  if(!preloads) return Promise.resolve().nodeify(callback);

  return Promise.map(preloads, function(i) {
    return Promise.fromCallback(function(callback) {
      i.strategy.preload(i.data, callback);
    });
  })
  .nodeify(callback);
}

module.exports = execPreloads;
