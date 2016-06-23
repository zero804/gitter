'use strict';

var Promise = require('bluebird');

/**
 * OR-style context-delegate
 */
function StaticContextDelegate(result) {
  this.result = result;
}

StaticContextDelegate.prototype = {
  isMember: Promise.method(function(/*userId*/) {
    return this.result;
  }),
};

module.exports = StaticContextDelegate;
