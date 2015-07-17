"use strict";

var testRequire = require('../test-require');
var assert = require('assert');
var mongooseUtils = testRequire('./utils/mongoose-utils');
var persistence = testRequire('./services/persistence-service');
var ObjectID = require('mongodb').ObjectID;
var Q = require('q');

describe('mongoose-utils', function() {

  var username, x, y;

  before(function() {
     username = '_test_' + Date.now();
     x = 'Bob ' + Date.now();
     y = 'Bob ' + (Date.now() + 1000);
  });

  after(function(done) {
    persistence.User.remove({ username: username }, done);
  });

  it('should create a new document', function(done) {
    mongooseUtils.upsert(persistence.User, { username: username }, { $setOnInsert: { displayName: x } })
      .spread(function(doc, updatedExisting) {
        assert.strictEqual(updatedExisting, false);
        assert.strictEqual(doc.username, username);
        assert.strictEqual(doc.displayName, x);
      })
      .nodeify(done);

  });

  it('should create a new document', function(done) {
    mongooseUtils.upsert(persistence.User, { username: username }, { $setOnInsert: { displayName: x } })
      .then(function() {
        return mongooseUtils.upsert(persistence.User, { username: username }, { $setOnInsert: { displayName: y } });
      })
      .spread(function(doc, updatedExisting) {
        assert.strictEqual(updatedExisting, true);
        assert.strictEqual(doc.username, username);
        assert.strictEqual(doc.displayName, x);
      })
      .then(function() {
        return mongooseUtils.upsert(persistence.User, { username: username }, { $set: { displayName: y } });
      })
      .spread(function(doc, updatedExisting) {
        assert.strictEqual(updatedExisting, true);
        assert.strictEqual(doc.username, username);
        assert.strictEqual(doc.displayName, y);
      })
      .nodeify(done);

  });
});
