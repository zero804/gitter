/*jshint globalstrict:true, trailing:false, unused:true, node:true */
'use strict';

var SnappyCache = require('snappy-cache');
var redis = require('../utils/redis');
var config = require('../utils/config');
var Q = require('q');

var cache = new SnappyCache({
  prefix: 'sc:',
  redis: redis.getClient(),
  ttl: config.get('github:cache-timeout')
});

function generateKey(moduleName, instanceId, propertyName, args) {
  var parts = [
    moduleName || '',
    instanceId || '',
    propertyName || ''
  ].concat(args);

  return parts.map(encodeURIComponent).join(':');
}

module.exports = function(moduleName, module) {
  return function() {
    var args = Array.prototype.slice.apply(arguments);
    var key = generateKey(moduleName, null, null, args);

    var d = Q.defer();
    cache.lookup(key, function(cb) {
      module.apply(null, args).nodeify(cb);
    }, d.makeNodeResolver());

    // assuming that the wrapped function returns a promise
    return d.promise;
  };
};
