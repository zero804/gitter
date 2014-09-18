/*jshint globalstrict:true, trailing:false, unused:true, node:true */
'use strict';

var SnappyCache = require('snappy-cache');
var redis = require('../utils/redis');
var config = require('../utils/config');
var Q = require('q');
var assert = require('assert');

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

function wrapFunction(moduleName, propertyName, func, getInstanceIdFunc) {
  return function() {
    var args = Array.prototype.slice.apply(arguments);
    var self = this;

    var instanceId = getInstanceIdFunc ? getInstanceIdFunc(this) : '';
    var key = generateKey(moduleName, instanceId, propertyName, args);

    var d = Q.defer();
    cache.lookup(key, function(cb) {
      func.apply(self, args).nodeify(cb);
    }, d.makeNodeResolver());

    // assuming that the original function returns a promise
    return d.promise;
  };
}

function wrapObject(moduleName, module, getInstanceIdFunc) {
  var wrapped = {};

  Object.keys(module).forEach(function(key) {
    var property = module[key];
    if(typeof property === 'function') {
      wrapped[key] = wrapFunction(moduleName, key, property, getInstanceIdFunc);
    } else {
      wrapped[key] = property;
    }
  });

  return wrapped;
}

function wrapClass(moduleName, Klass, getInstanceIdFunc) {
  var Wrapped = function() {
    Klass.apply(this, arguments);
  };

  Wrapped.prototype = wrapObject(moduleName, Klass.prototype, getInstanceIdFunc);

  return Wrapped;
}

module.exports = function(moduleName, module, options) {
  if(typeof module === 'function') {
    if(module.prototype && Object.keys(module.prototype).length) {
      // its a class
      assert(options && options.getInstanceId, 'options.getInstanceId required');
      return wrapClass(moduleName, module, options.getInstanceId);
    } else {
      // its a function
      return wrapFunction(moduleName, null, module);
    }
  } else if(typeof module === 'object') {
    // its a collection of functions
    return wrapObject(moduleName, module);
  }
};
