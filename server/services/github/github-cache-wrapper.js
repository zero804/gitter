/*jshint globalstrict:true, trailing:false, unused:true, node:true */
'use strict';


/*
 *
 * DEPRECATED, use cache-wrapper instead
 *
 */


var SnappyCache = require('snappy-cache');
var Q = require('q');
var redis = require('../../utils/redis');
var config = require('../../utils/config');
var winston = require('../../utils/winston');
var _ = require('underscore');

function getKeys(method, contextValues, args) {
  var arr = [method]
              .concat(contextValues)
              .concat(args);

  return arr
          .map(encodeURIComponent)
          .join(':');
}

function wrap(service, contextFunction, options) {
  winston.verbose('github-cache-wrapper deprecated, use cache-wrapper instead');

  if(!config.get('github:caching')) return service;
  if(!options) options = {};

  var sc = new SnappyCache(_.defaults(options, {
    prefix: 'sc:',
    redis: redis.getClient(),
    ttl: config.get('github:cache-timeout')
  }));

  Object.keys(service.prototype).forEach(function(value) {
    var v = service.prototype[value];

    if(typeof v !== 'function') return;

    var wrapped = function() {
      var self = this;
      var args = Array.prototype.slice.apply(arguments);
      var contextValues = contextFunction ? contextFunction.apply(self) : [];

      var key = getKeys(value, contextValues, args);
      var d = Q.defer();

      sc.lookup(key, function(cb) {
        var promise = v.apply(self, args);

        promise.nodeify(cb);
      }, d.makeNodeResolver());

      d.promise.then(function(x) {
        return x;
      });

      return d.promise;
    };

    service.prototype[value] = wrapped;
  }, {});

  return service;
}

module.exports = exports = wrap;
