'use strict';

var Promise = require('bluebird');

/**
 * A context-delegate that always returns a static result
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
