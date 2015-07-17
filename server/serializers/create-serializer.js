/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var env    = require('gitter-web-env');
var logger = env.logger;
var nconf  = env.config;
var stats  = env.stats;


var Q       = require("q");
var winston = require('../utils/winston');
var fs      = require('fs');
var path    = require('path');
var debug   = require('debug')('gitter:serializer');

var maxSerializerTime = nconf.get('serializer:warning-period');

/**
 * Lazy load strategies used to be important to work around issues with
 * circular dependencies in nodejs but this has been corrected further
 * up the dependency graph
 */
var LAZY_LOAD_STRATEGIES = false;
/**
 * Serialize some items using a strategy, returning a promise
 */
function serialize(items, strat, callback) {
  if(items === null || items === undefined) {
    return Q.resolve(items).nodeify(callback);
  }

  var single;
  if (Array.isArray(items)) {
    /** Array with zero items, shortcut */
    if (!items.length) {
      return Q.resolve([]).nodeify(callback);
    }
    single = false;
  } else {
    single = true;
    items = [ items ];
  }

  function pkg(i) {
    return single ? i[0] : i;
  }

  var start = Date.now();
  var d = Q.defer();
  strat.preload(items, function(err) {

    if(err) {
      winston.error("Error during preload", { exception: err });
      return d.reject(err);
    }

    var time = Date.now() - start;
    debug('strategy %s with %s items took %sms to complete', strat.name, items.length, time);
    if(time > maxSerializerTime) {
      stats.responseTime('serializer.slow.preload', time);

      logger.warn('Serialization took a excessive amount of time to complete', {
        strategy: strat.name,
        time: time,
        items: items.length
      });
    }

    var serialized = items.map(strat.map)
      .filter(function(f) {
        return f !== undefined;
      });

    if(strat.post) {
      serialized = strat.post(serialized);
    }

    d.resolve(pkg(serialized));
  });

  return d.promise.nodeify(callback);

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

  // XXX: deprecated
  e.serializeQ = serialize;

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

    if (LAZY_LOAD_STRATEGIES) {
      Object.defineProperty(e, strategyName, {
        enumerable: true,
        configurable: true,
        get: function() {
          var strategy = require('./' + serializerDirectory + '/' + baseName);

          Object.defineProperty(e, strategyName, {
            enumerable: true,
            configurable: false,
            writable: false,
            value: strategy
          });

          return strategy;
        }
      });

    } else {
      e[strategyName] = require('./' + serializerDirectory + '/' + baseName);
    }
  });

  return e;
};
