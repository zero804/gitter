/* jshint node:true, unused:strict */
/* global describe:true, it:true */
"use strict";

var testRequire = require('../test-require');

var USER = { username: 'gittertestbot' };
var badgerService = testRequire('./services/badger-service');
var client = badgerService.testOnly.client;

describe('badger-service', function() {
  // Skip tests in the automated test as they create too much noise
  if(process.env.NODE_ENV === 'test') return;

  this.timeout(100000);
  it('should create pull requests for repos that do not have a master branch', function(done) {
    return badgerService.sendBadgePullRequest('gittertestbot/does-not-have-a-master-branch', USER)
      .fin(function() {
        return client.del('/repos/gitter-badger/does-not-have-a-master-branch', { })
          .fail(function() {});
      })
      .nodeify(done);
  });

  it('should create pull requests for repos that do not have a README markdown', function(done) {
    return badgerService.sendBadgePullRequest('gittertestbot/no-readme-markdown-file-2', USER)
      .then(function() {
      })
      .fin(function() {
        return client.del('/repos/gitter-badger/no-readme-markdown-file-2', { })
          .fail(function() {});
      })
      .nodeify(done);
  });

  it('should create pull requests for repos that have a README.markdown', function(done) {
    return badgerService.sendBadgePullRequest('gittertestbot/readme-dot-markdown', USER)
      .then(function() {
      })
      .fin(function() {
        return client.del('/repos/gitter-badger/readme-dot-markdown', { })
          .fail(function() {});
      })
      .nodeify(done);
  });


});

