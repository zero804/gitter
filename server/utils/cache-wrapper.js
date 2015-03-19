'use strict';

var env = require('./env');
var config = env.config;

var SnappyCache = require('snappy-cache');
var Q = require('q');
var assert = require('assert');

var redisClient;
function getRedisCachingClient() {
  if (redisClient) return redisClient;
  redisClient = env.redis.createClient(config.get("redis_caching"));
  return redisClient;
}

function generateKey(moduleName, instanceId, propertyName, args) {
  var parts = [
    moduleName || '',
    instanceId || '',
    propertyName || ''
  ].concat(args);

  return parts.map(encodeURIComponent).join(':');
}

function wrapFunction(cache, moduleName, func, funcName, getInstanceIdFunc) {
  return function() {
    var args = Array.prototype.slice.apply(arguments);
    var self = this;

    var instanceId = getInstanceIdFunc ? getInstanceIdFunc(this) : '';
    var key = generateKey(moduleName, instanceId, funcName, args);

    var d = Q.defer();
    cache.lookup(key, function(cb) {
      func.apply(self, args).nodeify(cb);
    }, d.makeNodeResolver());

    // assuming that the original function returns a promise
    return d.promise;
  };
}

function wrapObject(cache, moduleName, obj, getInstanceIdFunc) {
  var wrapped = {};

  Object.keys(obj).forEach(function(key) {
    var property = obj[key];
    if(typeof property === 'function') {
      wrapped[key] = wrapFunction(cache, moduleName, property, key, getInstanceIdFunc);
    } else {
      wrapped[key] = property;
    }
  });

  return wrapped;
}

function wrapClass(cache, moduleName, Klass, getInstanceIdFunc) {
  var Wrapped = function() {
    Klass.apply(this, arguments);
  };

  Wrapped.prototype = wrapObject(cache, moduleName, Klass.prototype, getInstanceIdFunc);

  return Wrapped;
}

module.exports = function(moduleName, module, options) {

  var cache = new SnappyCache({
    prefix: 'sc:',
    redis: getRedisCachingClient(),
    ttl: options && options.ttl || 0
  });

  if(typeof module === 'function') {
    if(module.prototype && Object.keys(module.prototype).length) {
      // its a class
      assert(options && options.getInstanceId, 'options.getInstanceId required');
      return wrapClass(cache, moduleName, module, options.getInstanceId);
    } else {
      // its a function
      return wrapFunction(cache, moduleName, module);
    }
  } else if(typeof module === 'object') {
    // its a collection of functions
    return wrapObject(cache, moduleName, module);
  }
};
