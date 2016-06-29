'use strict';

var Promise = require('bluebird');

/**
 * OR-style context-delegate
 */
function DisjunctionContextDelegate(contextDelegates) {
  this.contextDelegates = contextDelegates;
}

DisjunctionContextDelegate.prototype = {
  isMember: function(userId) {
    return Promise.map(this.contextDelegates, function(delegate) {
      return delegate.isMember(userId)
    })
    .then(function(results) {
      // If any of the results are true, the result is true (OR)
      return results.some(function(result) {
        return !!result;
      });
    });
  },
};

module.exports = DisjunctionContextDelegate;
