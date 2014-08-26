/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var _                 = require("underscore");
var execPreloads      = require('../exec-preloads');

function SearchResultsStrategy(options) {
  var resultItemStrategy = options.resultItemStrategy;

  this.preload = function(searchResults, callback) {
    var items = _.flatten(searchResults.map(function(i) { return i.results; }), true);

    var strategies = [{
      strategy: resultItemStrategy,
      data: items
    }];

    execPreloads(strategies, callback);
  };

  this.map = function(item) {
    return {
      hasMoreResults: item.hasMoreResults,
      limit: item.limit,
      skip: item.skip,
      results: item.results.map(function(i) { return resultItemStrategy.map(i); })
    };
  };

}

SearchResultsStrategy.prototype = {
  name: 'SearchResultsStrategy'
};


module.exports = SearchResultsStrategy;
