"use strict";

var StatusError = require('statuserror');
var Q = require('q');

/* Ensure that the last promise has returned a value */
exports.required = function(value) {
	if(!value) throw new StatusError(404, 'Value required');
	return value;
};

function waterfall(makers, args, filter, limit, allResults) {
  // don't accidentally modify the calling code
  makers = makers.slice();

  // the first time around this is a new array, otherwise it gets passed in
  // when waterfaill "recurses"
  allResults = allResults || [];

  var nextMaker = makers.shift();
  if (nextMaker) {
    console.log("trying nextMaker", nextMaker);
    return nextMaker.apply(nextMaker, args)
      .then(function(newResults) {
        allResults = filter(allResults.concat(newResults));

        if (allResults.length >= limit) {
          // short-circuit if we have enough
          return allResults.slice(0, limit);

        } else {
          // makers should have one less item and allResults should have more
          // items than before
          return waterfall(makers, args, filter, limit, allResults);
        }
      })

  } else {
    // the end was reached, so return what we have so far
    return Q.resolve(allResults);
  }
}
exports.waterfall = waterfall;
