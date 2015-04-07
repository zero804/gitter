'use strict';

var testRequire = require('../test-require');
var assert = require('assert');

describe('bayeux', function() {
  var bayeux;

  before(function() {
    bayeux = testRequire('./web/bayeux');
  });

  describe('destroyClient', function(done) {
    it('should destroyClient', function() {
      bayeux.destroyClient('abc123', done);
    });
  });

  describe('publish', function() {
    it('should publish', function() {
      bayeux.publish('/test/', { test: 'message' });
    });
  });

  describe('clientExists', function() {
    it('should check client existence', function(done) {
      bayeux.clientExists('abc456', function(exists) {
        assert.strictEqual(exists, false);
        done();
      });
    });
  });
});
