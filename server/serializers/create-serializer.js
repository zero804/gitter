/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var Q       = require("q");
var winston = require('../utils/winston');
var fs      = require('fs');
var path    = require('path');

/**
 * Serialize some items using a strategy, returning a promise
 */
function serialize(items, strat, callback) {
  var d = Q.defer();

  if(!items) {
    return Q.resolve().nodeify(callback);
  }

  var single = !Array.isArray(items);
  if(single) {
    items = [ items ];
  }

  function pkg(i) {
    return single ? i[0] : i;
  }

  strat.preload(items, function(err) {

    if(err) {
      winston.error("Error during preload", { exception: err });
      return d.reject(err);
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
  });

  return e;
};
