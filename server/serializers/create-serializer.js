"use strict";

var env    = require('gitter-web-env');
var nconf  = env.config;
var stats  = env.stats;
var statsd = env.createStatsClient({ prefix: nconf.get('stats:statsd:prefix') + 'serializer.' });

var Promise = require('bluebird');
var fs      = require('fs');
var path    = require('path');
var debug   = require('debug')('gitter:serializer');
var Lazy    = require('lazy.js');

var maxSerializerTime = nconf.get('serializer:warning-period');

/**
 * Serialize some items using a strategy, returning a promise
 */
var serialize = Promise.method(function(items, strat) {
  if(items === null || items === undefined) {
    return items;
  }

  var statsPrefix = strat.strategyType ?
          'serializer.' + strat.strategyType + '.' + strat.name :
          'serializer.' + strat.name;

  var single;
  if (Array.isArray(items)) {
    /** Array with zero items, shortcut */
    if (!items.length) {
      return [];
    }

    statsd.histogram(statsPrefix + '.size', items.length, 0.1);

    single = false;
  } else {
    single = true;
    items = [ items ];
  }

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
      //
      // if(strat.post) {
      //   serialized = strat.post(serialized);
      // }

      if (single) {
        return serialized.first();
      } else {
        return serialized.toArray();
      }
    });

});

module.exports = function(serializerDirectory, e) {
  e.serialize = serialize;

  fs.readdirSync(__dirname + '/' + serializerDirectory).forEach(function(fileName) {
    if(!/\.js$/.test(fileName)) return;

    var baseName = path.basename(fileName, '.js');

    var strategyName = baseName.replace(/\-./g, function(match) {
      return match[1].toUpperCase();
    }).replace(/^./, function(match) {
      return match.toUpperCase();
    });

    var Strategy = require('./' + serializerDirectory + '/' + baseName);
    Strategy.prototype.strategyType = serializerDirectory; // Not ideal

    e[strategyName] = require('./' + serializerDirectory + '/' + baseName);
  });

  return e;
};
