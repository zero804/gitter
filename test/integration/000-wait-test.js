"use strict";

var testRequire = require('./test-require');
/* Force a connection */
require('gitter-web-persistence');
var env = testRequire('gitter-web-env');
var Promise = require('bluebird');
var onMongoConnect = testRequire('./utils/on-mongo-connect');

process.traceDeprecation = true;

describe('start', function() {
  this.timeout(30000);

  before(function() {
    return onMongoConnect()
      .then(function() {
        var redis = env.redis.getClient();
        var noPersistRedis = env.redis.createClient(process.env.REDIS_NOPERSIST_CONNECTION_STRING || env.config.get("redis_nopersist"));

        return Promise.map([redis, noPersistRedis], function(r) {
          return Promise.fromCallback(function(callback) {
            r.info(callback);
          });
        });
      });
  });

});
