/*jshint globalstrict:true, trailing:false, unused:true, node:true */
/*global describe:true, it:true */
"use strict";

var testRequire = require('./../test-require');
var fixtureLoader = require('../test-fixtures');
var Q = require('q');
var assert = require('assert');


describe("email-address-service", function() {

  it('gets private email addresses', function(done) {
    var service = createEmailAddressService({
      privateEmail: 'private@email.com'
    });

    service({ username: 'test-user', githubToken: 'token'})
      .then(function (email) {
        assert.equal(email, 'private@email.com');
      }).nodeify(done);
  });

  it('obeys overriding set by email:toAddress', function (done) {
    var overrideEmail = 'test@overriding.com';

    var service = createEmailAddressService({
      overrideEmail: overrideEmail
    });

    service({ username: 'test-user' })
      .then(function (email) {
        assert.equal(email, overrideEmail);
      }).nodeify(done);
  });

  it('gets valid public email addresses', function(done) {
    var service = createEmailAddressService({
      publicEmail: 'public@email.com'
    });

    service({ username: 'test-user' })
      .then(function (email) {
        assert.equal(email, 'public@email.com');
      }).nodeify(done);
  });

  it('returns nothing if the public email address is invalid #slow', function(done) {
    var service = createEmailAddressService({
      publicEmail: 'DONT EMAIL ME'
    });

    service({ username: 'test-user' })
      .then(function (email) {
        assert(!email);
      }).nodeify(done);
  });

  describe('non-github emails', function() {
    var emailAddressService = testRequire('./services/email-address-service');

    var fixture = {};
    before(fixtureLoader(fixture, {
      user1: {
        identities: [{provider: 'google', providerKey: 'google-email'}]
      },
      identity1: {
        user: 'user1',
        provider: 'google',
        providerKey: 'google-email',
        email: 'foo@bar.com'
      },
    }));

    after(function() {
      fixture.cleanup();
    });

    it('returns the email from the identity for google', function() {
      return emailAddressService(fixture.user1)
        .then(function(email) {
          assert.equal(email, fixture.identity1.email);
        });
    });
  });
});

function createEmailAddressService(stubData) {

  var GitHubMeService = function() {};
  GitHubMeService.prototype.getEmail = function() {
    return Q.resolve(stubData.privateEmail);
  };

  var GitHubUserService = function() {};
  GitHubUserService.prototype.getUser = function() {
    return Q.resolve({ email: stubData.publicEmail });
  };

  var env = {
    config: {
      get: function () {
        return stubData.overrideEmail;
      }
    }
  };

  return testRequire.withProxies('gitter-web-github-backend/lib/github-email-address-service', {
    'gitter-web-env': env,
    'gitter-web-github': {
      GitHubMeService: GitHubMeService,
      GitHubUserService: GitHubUserService
    }
  });
}
