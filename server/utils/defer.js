'use strict';

var Q = require('q');

/**
 * This is a temporary migration measure during the move to bluebird promises.
 */
module.exports = function defer() {
  // TODO: switch to bluebird, remember to add `.makeNodeResolver`
  return Q.defer();
};
