"use strict";

var testRequire = require('./test-require');
/* Force a connection */
testRequire('./services/persistence-service');
var env = testRequire('./utils/env');

var onMongoConnect = testRequire('./utils/on-mongo-connect');

describe('start', function() {
  this.timeout(30000);

  before(function(done) {
    onMongoConnect(function(err) {
      if (err) return done(err);

      var redis = env.redis.getClient();
      redis.info(done);
    });

  });

  it('should have a valid mongoose and redis connection', function() {
  });

});
