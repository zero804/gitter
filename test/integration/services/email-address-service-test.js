/*jshint globalstrict:true, trailing:false, unused:true, node:true */
/*global describe:true, it:true */
"use strict";

var testRequire = require('./../test-require');
var Q = require('q');
var assert = require('assert');

describe("email-address-service", function() {

  it('gets private email addresses', function(done) {
    var service = createEmailAddressService({
      privateEmail: 'private@email.com'
    });

    service({ username: 'test-user', githubToken: 'token'})
      .then(function(email) {
        assert.equal(email, 'private@email.com');
      }).nodeify(done);
  });

  it('gets valid public email addresses', function(done) {
    var service = createEmailAddressService({
      publicEmail: 'public@email.com'
    });

    service({ username: 'test-user' })
      .then(function(email) {
        assert.equal(email, 'public@email.com');
      }).nodeify(done);
  });

  it('returns nothing if the public email address is invalid', function(done) {
    var service = createEmailAddressService({
      publicEmail: 'DONT EMAIL ME'
    });

    service({ username: 'test-user' })
      .then(function(email) {
        assert(!email);
      }).nodeify(done);
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

  return testRequire.withProxies('./services/email-address-service', {
    './github/github-me-service': GitHubMeService,
    './github/github-user-service': GitHubUserService
  });
}