'use strict';

/**
 * To enable plan debugging, use
 * DEBUG='gitter:serializer:tracing:plan'
 */
var Promise = require('bluebird');
var debug = require('debug')('gitter:serializer:tracing');
var debugPlan = require('debug')('gitter:serializer:tracing:plan');

var env    = require('gitter-web-env');
var nconf  = env.config;
var stats  = env.stats;
var statsd = require('./serialize-stats-client');

var maxSerializerTime = nconf.get('serializer:warning-period');

function MultiPreloadDebug(strategy) {
  this.promises = [];
  this.start = Date.now();
  this.strategy = strategy;
}

MultiPreloadDebug.prototype = {
  push: function(strategy, items) {
    var time = Date.now();
    var promise = Promise.resolve(strategy.preload(items));

    this.promises.push(promise.then(function(children) {
      var n = items && items.size() || 0;
      return { name: strategy.name, n: n, time: Date.now() - time, children: children };
    }));

  },

  all: function() {
    return Promise.all(this.promises)
      .bind(this)
      .then(function(children) {
        return { name: this.strategy.name, time: Date.now() - this.start, children: children };

      });
  }
};

function MultiPreloadProd() {
  this.promises = [];
}

MultiPreloadProd.prototype = {
  push: function(strategy, items) {
    this.promises.push(strategy.preload(items));
  },

  all: function() {
    return Promise.all(this.promises);
  }
};

function debugStrategyPlan(strat, start, preloadData, n) {
  if (preloadData) {
    debugPlan('Plan for %s n=%s: %j', strat.name, n, preloadData);
  }
  productionStrategyPlan(strat, start, preloadData, n);
}

function productionStrategyPlan(strat, start, preloadData, n) {
  var statsPrefix = strat.strategyType ?
          'serializer.' + strat.strategyType + '.' + strat.name :
          'serializer.' + strat.name;

  statsd.histogram(statsPrefix + '.size', n, 0.1);

  var time = Date.now() - start;
  debug('strategy %s with %s items took %sms to complete', strat.name, n, time);
  statsd.timing(statsPrefix + '.timing', time, 0.1);

  if(time > maxSerializerTime) {
    stats.responseTime('serializer.slow.preload', time);
  }
}

module.exports = {
  MultiPreload:  debugPlan.enabled ? MultiPreloadDebug : MultiPreloadProd,
  debugStrategyPlan: debugPlan.enabled ? debugStrategyPlan : productionStrategyPlan
}
