"use strict";

var StatusError = require('statuserror');
var Q = require('q');

/* Ensure that the last promise has returned a value */
exports.required = function(value) {
	if(!value) throw new StatusError(404, 'Value required');
	return value;
};

/* Always return a given value from the promise */
// Q ALREADY DOES THIS
// exports.value = function(value) {
// 	return function() {
// 		return value;
// 	};
// };

function waterfall(makers, args, filter, limit) {
  /*
  `makers` is an array of functions that will return promises when called. Each
  promise has to resolve to an array.

  `args` is an array of arguments that will be passed to every maker function.

  `filter` is a function that will be applied to the results before checking
  the limit.

  The maker functions will be called one by one and the resulting promises
  resolved. Each must resolve to an array of results. At each step the results
  will be concatenated to all the previous results. Once there's at least
  `limit` amount of results, execution will stop and this function's promise
  will resolve to the first `limit` results. If the end is reached, it will
  just resolve to the results that were obtained.
  */

  // don't modify the calling code..
  makers = makers.slice();

  var allResults = [];
  var deferred = Q.defer();

  function tryNext() {
    var nextMaker = makers.shift();
    if (nextMaker) {
      nextMaker.apply(nextMaker, args)
        .then(function(newResults) {
          allResults = filter(allResults.concat(newResults));
          if (allResults.length >= limit) {
            deferred.resolve(allResults.slice(0, limit));
          } else {
            tryNext();
          }
        })
        .catch(function(err) {
          deferred.reject(err);
        });
    } else {
      deferred.resolve(allResults); // just send what we have
    }
  }

  tryNext();

  return deferred.promise;
}
exports.waterfall = waterfall;
