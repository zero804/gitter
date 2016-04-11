'use strict';

var env    = require('gitter-web-env');
var nconf  = env.config;
var stats  = env.stats;
var statsd = require('./serialize-stats-client');

var Promise = require('bluebird');
var debug   = require('debug')('gitter:serializer');
var Lazy    = require('lazy.js');

var maxSerializerTime = nconf.get('serializer:warning-period');

/**
 * Serialize some items using a strategy, returning a promise
 */
module.exports = Promise.method(function serialize(items, strat) {
  if(items === null || items === undefined) {
    return null;
  }

  if (!Array.isArray(items)) {
    throw new Error('serialize requires an array of values');
  }

  if (!items.length) {
    return [];
  }

  var statsPrefix = strat.strategyType ?
          'serializer.' + strat.strategyType + '.' + strat.name :
          'serializer.' + strat.name;

  statsd.histogram(statsPrefix + '.size', items.length, 0.1);

  var start = Date.now();
  var seq = Lazy(items);

  return Promise.try(function() {
      return strat.preload(seq);
    })
    .then(function() {
      var time = Date.now() - start;
      debug('strategy %s with %s items took %sms to complete', strat.name, items.length, time);
      statsd.timing(statsPrefix + '.timing', time, 0.1);

      if(time > maxSerializerTime) {
        stats.responseTime('serializer.slow.preload', time);
      }

      var serialized = seq.map(strat.map)
        .filter(function(f) {
          return f !== undefined && f !== null;
        });

      if(strat.postProcess) {
        return strat.postProcess(serialized);
      } else {
        return serialized.toArray();
      }
    });

});
