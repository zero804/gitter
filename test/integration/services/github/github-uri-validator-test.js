"use strict";

var testRequire     = require('../../test-require');
var assert          = require("assert");
var githubUriValidator = testRequire('./services/github/github-uri-validator');

var FAKE_USER = { username: 'gittertestbot', githubToken: '***REMOVED***'};

describe('github-user-service #slow', function() {
  it('validate real org', function(done) {
    githubUriValidator(FAKE_USER, 'gitterHQ')
      .spread(function(type, uri/*, description */) {
        assert.strictEqual(type, 'ORG');
        assert.strictEqual(uri, 'gitterHQ');
      })
      .nodeify(done);
  });

  it('validate real repo', function(done) {
    githubUriValidator(FAKE_USER, 'gitterHQ/gitter')
      .spread(function(type, uri/*, description */) {
        assert.strictEqual(type, 'REPO');
        assert.strictEqual(uri, 'gitterHQ/gitter');
      })
      .nodeify(done);
  });

  it('validate nonexistant org', function(done) {
    githubUriValidator(FAKE_USER, 'gitterHQskldjlsadkjasd')
      .spread(function(type /*, uri, description */) {
        assert(!type);
      })
      .nodeify(done);
  });

  it('validate nonexistant repo', function(done) {
    githubUriValidator(FAKE_USER, 'gitterHQskldjlsadkjasd/dklasjdsa')
      .spread(function(type /*, uri, description */) {
        assert(!type);
      })
      .nodeify(done);
  });

});
