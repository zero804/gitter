/*jshint globalstrict:true, trailing:false, unused:true, node:true */
'use strict';


/*
 *
 * DEPRECATED, use cache-wrapper instead
 *
 */


var SnappyCache = require('snappy-cache');
var Q = require('q');
var env = require('gitter-web-env');
var config = env.config;
var _ = require('underscore');
var util = require("util");

var redisClient;
function getRedisCachingClient() {
  if (redisClient) return redisClient;
  redisClient = env.redis.createClient(process.env.REDIS_CACHING_CONNECTION_STRING || config.get("redis_caching"));
  return redisClient;
}

function getKeys(method, contextValues, args) {
  var arr = [method]
              .concat(contextValues)
              .concat(args);

  return arr
          .map(encodeURIComponent)
          .join(':');
}

function wrap(Service, contextFunction, options) {
  if(!config.get('github:caching')) return Service;
  if(!options) options = {};

  var sc = new SnappyCache(_.defaults(options, {
    prefix: 'sc:',
    redis: getRedisCachingClient(),
    ttl: config.get('github:cache-timeout')
  }));

  var ServiceWrapper = function() {
    Service.apply(this, arguments);
  };

  util.inherits(ServiceWrapper, Service);

  Object.keys(Service.prototype).forEach(function(value) {
    var method = Service.prototype[value];

    /* Only create prototypes for methods... */
    if(typeof method !== 'function') return;

    var wrapped = function() {
      var self = this;
      var args = Array.prototype.slice.apply(arguments);
      var contextValues = contextFunction ? contextFunction.apply(self) : [];

      var key = getKeys(value, contextValues, args);
      var d = Q.defer();
      sc.lookup(key, function(cb) {
        var promise = method.apply(self, args);
        promise.nodeify(cb);
      }, d.makeNodeResolver());

      return d.promise;
    };

    ServiceWrapper.prototype[value] = wrapped;
  }, {});

  return ServiceWrapper;
}

module.exports = exports = wrap;
