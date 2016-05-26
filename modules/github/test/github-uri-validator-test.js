"use strict";

var assert = require("assert");
var githubUriValidator = require('..').GitHubUriValidator;

var FAKE_USER = { username: 'gittertestbot', githubToken: '***REMOVED***'};


describe('github-user-service #slow', function() {
  it('validate real org', function(done) {
    githubUriValidator(FAKE_USER, 'gitterHQ')
      .then(function(result) {
        assert(result);
        assert.strictEqual(result.type, 'ORG');
        assert.strictEqual(result.uri, 'gitterHQ');
        assert.strictEqual(result.githubId, 5990364);
      })
      .nodeify(done);
  });

  it('validate real repo', function(done) {
    githubUriValidator(FAKE_USER, 'gitterHQ/gitter')
      .then(function(result) {
        assert(result);
        assert.strictEqual(result.type, 'REPO');
        assert.strictEqual(result.uri, 'gitterHQ/gitter');
        assert.strictEqual(result.githubId, 14863998);
      })
      .nodeify(done);
  });

  it('validate nonexistant org', function(done) {
    githubUriValidator(FAKE_USER, 'gitterHQskldjlsadkjasd')
      .then(function(result) {
        assert(!result);
      })
      .nodeify(done);
  });

  it('validate nonexistant repo', function(done) {
    githubUriValidator(FAKE_USER, 'gitterHQskldjlsadkjasd/dklasjdsa')
      .then(function(result) {
        assert(!result);
      })
      .nodeify(done);
  });

});
