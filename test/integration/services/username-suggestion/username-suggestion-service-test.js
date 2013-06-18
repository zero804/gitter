/*jslint node: true, unused:true */
/*global describe:true, it: true */
"use strict";

var testRequire = require('../../test-require');

var assert = require('assert');
var underTest = testRequire('./services/username-suggestion/username-suggestion-service');

describe('username-suggestion-service', function() {
  it('should suggest usernames for Andrews email address', function(done) {

    underTest.suggestUsernamesForEmail('andrewn@datatribe.net')
      .then(function(usernameSuggestions) {
        assert(usernameSuggestions.length > 1);
      })
      .nodeify(done);
  });

  it('should suggest usernames for Mikes email address', function(done) {
    underTest.suggestUsernamesForEmail('mike@hipgeeks.net')
      .then(function(usernameSuggestions) {
        assert(usernameSuggestions.length >= 1);
      })
      .nodeify(done);
  });



  it('should suggest usernames for seed andrewn', function(done) {
    underTest.suggestUsernames('andrewn')
      .then(function(usernameSuggestions) {
        assert(usernameSuggestions.length == 2);
      })
      .nodeify(done);
  });


  it('should not suggest usernames for seed "bollocks"', function(done) {
    underTest.suggestUsernames('bollocks')
      .then(function(usernameSuggestions) {
        assert(usernameSuggestions.length == 1);
        var s = usernameSuggestions[0];
        assert.strictEqual(s.disallowed, true);
      })
      .nodeify(done);
  });


  it('should suggest usernames for a user', function(done) {
    underTest.suggestUsernamesForUser({ email: 'andrewn@datatribe.net', displayName: 'Andrew Newdigate'})
      .then(function(usernameSuggestions) {
        assert(usernameSuggestions.length > 2);
      })
      .nodeify(done);
  });


});