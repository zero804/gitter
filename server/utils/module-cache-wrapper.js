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

function wrapFunction(moduleName, instanceId, propertyName, func) {
  return function() {
    var args = Array.prototype.slice.apply(arguments);
    var key = generateKey(moduleName, instanceId, propertyName, args);

    var d = Q.defer();
    cache.lookup(key, function(cb) {
      func.apply(null, args).nodeify(cb);
    }, d.makeNodeResolver());

    // assuming that the wrapped function returns a promise
    return d.promise;
  };
}

module.exports = function(moduleName, module) {
  if(typeof module === 'function') {
    return wrapFunction(moduleName, null, null, module);
  } else if(typeof module === 'object') {
    var wrapped = {};

    Object.keys(module).forEach(function(key) {
      var property = module[key];
      if(typeof property === 'function') {
        wrapped[key] = wrapFunction(moduleName, null, key, property);
      } else {
        wrapped[key] = property;
      }
    });

    return wrapped;
  }


};
