/*jshint trailing:false, unused:true, node:true */
"use strict";

var env    = require('gitter-web-env');
var nconf  = env.config;
var stats  = env.stats;
var statsd = env.createStatsClient({ prefix: nconf.get('stats:statsd:prefix') + 'serializer.' });

var Promise = require('bluebird');
var winston = require('../utils/winston');
var fs      = require('fs');
var path    = require('path');
var debug   = require('debug')('gitter:serializer');

var maxSerializerTime = nconf.get('serializer:warning-period');

/**
 * Serialize some items using a strategy, returning a promise
 */
function serialize(items, strat, callback) {
  if(items === null || items === undefined) {
    return Promise.resolve(items).nodeify(callback);
  }

  var statsPrefix = strat.strategyType ?
          'serializer.' + strat.strategyType + '.' + strat.name :
          'serializer.' + strat.name;

  var single;
  if (Array.isArray(items)) {
    /** Array with zero items, shortcut */
    if (!items.length) {
      return Promise.resolve([]).nodeify(callback);
    }

    statsd.histogram(statsPrefix + '.size', items.length, 0.1);

    single = false;
  } else {
    single = true;
    items = [ items ];
  }

  var start = Date.now();

  return new Promise(function(resolve, reject) {
    strat.preload(items, function(err) {

      if(err) {
        winston.error("Error during preload", { exception: err });
        return reject(err);
      }

      var time = Date.now() - start;
      debug('strategy %s with %s items took %sms to complete', strat.name, items.length, time);
      statsd.timing(statsPrefix + '.timing', time, 0.1);

      if(time > maxSerializerTime) {
        stats.responseTime('serializer.slow.preload', time);
      }

      var serialized = items.map(strat.map)
        .filter(function(f) {
          return f !== undefined;
        });

      if(strat.post) {
        serialized = strat.post(serialized);
      }

      if (single) {
        return resolve(serialized[0]);
      } else {
        return resolve(serialized);
      }
    });

  })
  .nodeify(callback);

}

function serializeExcludeNulls(items, strat, callback) {
  var single = !Array.isArray(items);

  return serialize(items, strat)
    .then(function(results) {
      if(single) return results;
      return results.filter(function(f) { return !!f; });
    })
    .nodeify(callback);
}

module.exports = function(serializerDirectory, e) {
  e.serialize = serialize;
  e.serializeExcludeNulls = serializeExcludeNulls;

  function eagerLoadStrategies() {
    Object.keys(e).forEach(function(key) {
      // jshint -W030
      e[key]; // NB! Force the lazy-loading of strategies
      // jshint +W030
    });
  }

  e.testOnly = {
    eagerLoadStrategies: eagerLoadStrategies
  };

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
