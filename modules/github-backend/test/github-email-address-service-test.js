"use strict";

var assert = require('assert');

var TOKEN = '***REMOVED***';
var USERNAME = 'gittertestbot';

describe("email-address-service #github", function() {

  describe('integration #slow', function() {
    it('should return the validated email address if the user has a token', function() {
      var service = require('../lib/github-email-address-service');

      return service({ username: USERNAME, githubToken: TOKEN })
        .then(function (email) {
          assert.strictEqual(email, 'gittertestbot@datatribe.net');
        });
    });

    it('should return nothing if the user does not have a token and does not have a public address', function() {
      var service = require('../lib/github-email-address-service');

      return service({ username: 'gitterawesome' })
        .then(function (email) {
          assert(!email);
        });
    });

    it('should return a public email address from profile with attemptDiscovery', function() {
      var service = require('../lib/github-email-address-service');

      return service({ username: 'gitter-badger' }, { attemptDiscovery: true })
        .then(function (email) {
          assert.strictEqual(email, 'badger@gitter.im');
        });
    });

    it('should return a public email address from commits with attemptDiscovery', function() {
      var service = require('../lib/github-email-address-service');

      return service({ username: 'gittertestbot' }, { attemptDiscovery: true })
        .then(function (email) {
          assert.strictEqual(email, 'gittertestbot@datatribe.net');
        });
    });

    it('should return nothing if nothing is available', function() {
      var service = require('../lib/github-email-address-service');

      return service({ username: 'mbtesting3' }, { attemptDiscovery: true })
        .then(function (email) {
          assert(!email);
        });
    });


  });
});
