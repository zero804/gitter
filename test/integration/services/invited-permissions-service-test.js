/* jshint node:true, unused:strict */
/* global describe:true, it:true */
"use strict";

var testRequire = require('../test-require');
var assert = require("assert");
var Q = require('q');

var username = 'test-user';

function createServiceWithStubData(callback) {
  return testRequire.withProxies('./services/invited-permissions-service', {
    './github/github-members': {
      isMember: function(username, uri, githubType) {
        return Q.fcall(function() {
          return callback(username, uri, githubType);
        });
      }
    }
  });
}

describe('invited-permissions-service', function() {

  describe('repo room', function() {

    var room = { uri: 'gitterHQ/gitter', githubType: 'REPO' };

    it('allows invites if user can join', function(done) {
      var service = createServiceWithStubData(function() {
        return true;
      });

      service(username, room).then(function(isAllowed) {
        assert(isAllowed);
      }).nodeify(done);
    });

    it('doesnt allow invites if user cant join', function(done) {
      var service = createServiceWithStubData(function() {
        return false;
      });

      service(username, room).then(function(isAllowed) {
        assert(!isAllowed);
      }).nodeify(done);
    });

    it('queries the correct repo', function(done) {
      var service = createServiceWithStubData(function(username, uri, githubType) {
        assert.equal(githubType, 'REPO');
        assert.equal(uri, 'gitterHQ/gitter');
        done();
      });

      service(username, room).fail(done);
    });

  });

  describe('org room', function() {

    var room = { uri: 'gitterHQ', githubType: 'ORG' };

    it('allows invites if user can join', function(done) {
      var service = createServiceWithStubData(function() {
        return true;
      });

      service(username, room).then(function(isAllowed) {
        assert(isAllowed);
      }).nodeify(done);
    });

    it('doesnt allow invites if user cant join', function(done) {
      var service = createServiceWithStubData(function() {
        return false;
      });

      service(username, room).then(function(isAllowed) {
        assert(!isAllowed);
      }).nodeify(done);
    });

    it('queries the correct org', function(done) {
      var service = createServiceWithStubData(function(username, uri, githubType) {
        assert.equal(githubType, 'ORG');
        assert.equal(uri, 'gitterHQ');
        done();
      });

      service(username, room).fail(done);
    });

  });

  describe('one to one room', function() {

    var room = { uri: 'trevorah', githubType: 'ONETOONE' };

    it('doesnt allow invites even if user can join', function(done) {
      var service = createServiceWithStubData(function() {
        return true;
      });

      service(username, room).then(function(isAllowed) {
        assert(!isAllowed);
      }).nodeify(done);
    });

    it('doesnt allow invites if user cant join', function(done) {
      var service = createServiceWithStubData(function() {
        return false;
      });

      service(username, room).then(function(isAllowed) {
        assert(!isAllowed);
      }).nodeify(done);
    });

  });

  describe('org channel (public)', function() {

    var room = { uri: 'gitterHQ/dawgs', githubType: 'ORG_CHANNEL', security: 'PUBLIC' };

    it('allows invites if user can join', function(done) {
      var service = createServiceWithStubData(function() {
        return true;
      });

      service(username, room).then(function(isAllowed) {
        assert(isAllowed);
      }).nodeify(done);
    });

    it('allow invites no matter what', function(done) {
      var service = createServiceWithStubData(function() {
        return false;
      });

      service(username, room).then(function(isAllowed) {
        assert(isAllowed);
      }).nodeify(done);
    });

  });

  describe('org channel (private)', function() {

    var room = { uri: 'gitterHQ/dawgs', githubType: 'ORG_CHANNEL', security: 'PRIVATE' };

    it('allows invites if user can join', function(done) {
      var service = createServiceWithStubData(function() {
        return true;
      });

      service(username, room).then(function(isAllowed) {
        assert(isAllowed);
      }).nodeify(done);
    });

    it('allow invites no matter what', function(done) {
      var service = createServiceWithStubData(function() {
        return false;
      });

      service(username, room).then(function(isAllowed) {
        assert(isAllowed);
      }).nodeify(done);
    });

  });

  describe('org channel (inherited)', function() {

    var room = { uri: 'gitterHQ/dawgs', githubType: 'ORG_CHANNEL', security: 'INHERITED' };

    it('allows invites if user can join org', function(done) {
      var service = createServiceWithStubData(function() {
        return true;
      });

      service(username, room).then(function(isAllowed) {
        assert(isAllowed);
      }).nodeify(done);
    });

    it('doesnt allow invites if user cant join org', function(done) {
      var service = createServiceWithStubData(function() {
        return false;
      });

      service(username, room).then(function(isAllowed) {
        assert(!isAllowed);
      }).nodeify(done);
    });

    it('queries the correct org', function(done) {
      var service = createServiceWithStubData(function(username, uri, githubType) {
        assert.equal(githubType, 'ORG');
        assert.equal(uri, 'gitterHQ');
        done();
      });

      service(username, room).fail(done);
    });

  });

  describe('repo channel (public)', function() {

    var room = { uri: 'gitterHQ/gitter/design', githubType: 'REPO_CHANNEL', security: 'PUBLIC' };

    it('allows invites if user can join', function(done) {
      var service = createServiceWithStubData(function() {
        return true;
      });

      service(username, room).then(function(isAllowed) {
        assert(isAllowed);
      }).nodeify(done);
    });

    it('allow invites no matter what', function(done) {
      var service = createServiceWithStubData(function() {
        return false;
      });

      service(username, room).then(function(isAllowed) {
        assert(isAllowed);
      }).nodeify(done);
    });

  });

  describe('repo channel (private)', function() {

    var room = { uri: 'gitterHQ/gitter/design', githubType: 'REPO_CHANNEL', security: 'PRIVATE' };

    it('allows invites if user can join', function(done) {
      var service = createServiceWithStubData(function() {
        return true;
      });

      service(username, room).then(function(isAllowed) {
        assert(isAllowed);
      }).nodeify(done);
    });

    it('allow invites no matter what', function(done) {
      var service = createServiceWithStubData(function() {
        return false;
      });

      service(username, room).then(function(isAllowed) {
        assert(isAllowed);
      }).nodeify(done);
    });

  });

  describe('repo channel (inherited)', function() {

    var room = { uri: 'gitterHQ/gitter/design', githubType: 'REPO_CHANNEL', security: 'INHERITED' };

    it('allows invites if user can join repo', function(done) {
      var service = createServiceWithStubData(function() {
        return true;
      });

      service(username, room).then(function(isAllowed) {
        assert(isAllowed);
      }).nodeify(done);
    });

    it('doesnt allow invites if user cant join repo', function(done) {
      var service = createServiceWithStubData(function() {
        return false;
      });

      service(username, room).then(function(isAllowed) {
        assert(!isAllowed);
      }).nodeify(done);
    });

    it('queries the correct repo', function(done) {
      var service = createServiceWithStubData(function(username, uri, githubType) {
        assert.equal(githubType, 'REPO');
        assert.equal(uri, 'gitterHQ/gitter');
        done();
      });

      service(username, room).fail(done);
    });

  });

  describe('user channel', function() {

    var room = { uri: 'trevorah/dawgs', githubType: 'USER_CHANNEL' };

    it('allows invites if user can join', function(done) {
      var service = createServiceWithStubData(function() {
        return true;
      });

      service(username, room).then(function(isAllowed) {
        assert(isAllowed);
      }).nodeify(done);
    });

    it('allow invites no matter what', function(done) {
      var service = createServiceWithStubData(function() {
        return false;
      });

      service(username, room).then(function(isAllowed) {
        assert(isAllowed);
      }).nodeify(done);
    });

  });

});

