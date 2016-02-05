/* jshint node:true, unused:strict */
/* global describe:true, it:true */
"use strict";

var testRequire = require('../test-require');

var USER = { username: 'gittertestbot' };
var badgerService = testRequire('./services/badger-service');
var client = badgerService.testOnly.client;

describe('badger-service #slow', function() {
  // Skip tests in the automated test as they create too much noise
  if(process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'test-docker' || process.env.SKIP_BADGER_TESTS) return;

  this.timeout(100000);
  it('should create pull requests for repos that do not have a master branch', function(done) {
    return badgerService.sendBadgePullRequest('gittertestbot/does-not-have-a-master-branch', USER)
      .finally(function() {
        return client.del('/repos/gitter-badger/does-not-have-a-master-branch', { })
          .catch(function() {});
      })
      .nodeify(done);
  });

  it('should create pull requests for repos that do not have a README markdown', function(done) {
    return badgerService.sendBadgePullRequest('gittertestbot/no-readme-markdown-file-2', USER)
      .then(function() {
      })
      .finally(function() {
        return client.del('/repos/gitter-badger/no-readme-markdown-file-2', { })
          .catch(function() {});
      })
      .nodeify(done);
  });

  it('should create pull requests for repos that have a README.markdown', function(done) {
    return badgerService.sendBadgePullRequest('gittertestbot/readme-dot-markdown', USER)
      .then(function() {
      })
      .finally(function() {
        return client.del('/repos/gitter-badger/readme-dot-markdown', { })
          .catch(function() {});
      })
      .nodeify(done);
  });

  it('should create pull requests for repos that have a textile readme', function(done) {
    return badgerService.sendBadgePullRequest('gittertestbot/readme-dot-textile', USER)
      .then(function() {
      })
      .finally(function() {
        return client.del('/repos/gitter-badger/readme-dot-textile', { })
          .catch(function() {});
      })
      .nodeify(done);
  });

  it('should create pull requests for repos that have a rst readme', function(done) {
    return badgerService.sendBadgePullRequest('gittertestbot/readme-dot-rst', USER)
      .then(function() {
      })
      .finally(function() {
        return client.del('/repos/gitter-badger/readme-dot-rst', { })
          .catch(function() {});
      })
      .nodeify(done);
  });

  it('should create pull requests for repos that have a plaintext readme', function(done) {
    return badgerService.sendBadgePullRequest('gittertestbot/readme-dot-txt', USER)
      .then(function() {
      })
      .finally(function() {
        return client.del('/repos/gitter-badger/readme-dot-txt', { })
          .catch(function() {});
      })
      .nodeify(done);
  });


});
