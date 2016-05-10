'use strict';

var Promise = require('bluebird');
var Lazy = require('lazy.js');
var debugStrategyPlan = require('./strategy-tracing').debugStrategyPlan

/**
 * Serialize some items using a strategy, returning a promise
 */
module.exports = Promise.method(function serializeObject(item, strat) {
  if(item === null || item === undefined) {
    return item;
  }

  var start = Date.now();
  var seq = Lazy([ item ]);

  return Promise.resolve(strat.preload(seq))
    .bind({
      strat: strat,
      start: start,
      seq: seq,
    })
    .then(function(preloadData) {
      var strat = this.strat;
      var seq = this.seq;
      var start = this.start;

      debugStrategyPlan(strat, start, preloadData, 1);

      var serialized = seq.map(strat.map)
        .filter(function(f) {
          return f !== undefined && f !== null;
        });

      return serialized.first();
    });

});
