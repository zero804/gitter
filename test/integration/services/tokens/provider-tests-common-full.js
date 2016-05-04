'use strict';

var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var assert = require('assert');

module.exports = function(underTest) {

  describe('non-anonymous', function() {
    var userId, clientId;

    beforeEach(function() {
      userId = mongoUtils.getNewObjectIdString() + "";
      clientId = mongoUtils.getNewObjectIdString() + "";
    });

    it('should create tokens for user-clients that do not exist', function(done) {
      underTest.getToken(userId, clientId, function(err, token) {
        if (err) return done(err);
        assert(token);
        done();
      });
    });

    it('should not validate tokens that do not exist', function(done) {
      underTest.validateToken("test" + Math.random(), function(err, userClient) {
        if (err) return done(err);
        assert(!userClient);
        done();
      });
    });

    it('should find tokens that have been cached', function(done) {
      underTest.getToken(userId, clientId, function(err, token2) {
        if (err) return done(err);

        underTest.validateToken(token2, function(err, userClient) {
          if (err) return done(err);

          assert(Array.isArray(userClient));
          // Deep equals freaks out with mongo ids
          assert.strictEqual(userId, "" + userClient[0]);
          assert.strictEqual(clientId, "" + userClient[1]);
          done();
        });

      });
    });

    it('should reuse the same tokens', function(done) {
      underTest.getToken(userId, clientId, function(err, token2) {
        if (err) return done(err);

        underTest.getToken(userId, clientId, function(err, token3) {
          if (err) return done(err);
          assert.strictEqual(token2, token3);
          done();
        });

      });

    });

    it('should not find tokens that have been deleted', function(done) {
      underTest.getToken(userId, clientId, function(err, token2) {
        if (err) return done(err);

        underTest.deleteToken(token2, function(err) {
          if(err) return done(err);

          underTest.getToken(userId, clientId, function(err, token3) {
            if (err) return done(err);
            assert(token2 != token3);

            underTest.validateToken(token2, function(err, userClient) {
              if (err) return done(err);
              assert(!userClient);

              underTest.validateToken(token3, function(err, userClient) {
                if (err) return done(err);

                assert(Array.isArray(userClient));
                // Deep equals freaks out with mongo ids
                assert.strictEqual(userId, "" + userClient[0]);
                assert.strictEqual(clientId, "" + userClient[1]);

                done();
              });
            });
          });
        });

      });

    });

  });

};
