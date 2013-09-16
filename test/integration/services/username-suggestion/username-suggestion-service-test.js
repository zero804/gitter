/*jslint node: true, unused:true */
/*global describe:true, it: true, before:false, after:false */
"use strict";

var testRequire = require('../../test-require');
var fixtureLoader = require('../../test-fixtures');

var assert = require('assert');
var Q = require('q');
var underTest = testRequire('./services/username-suggestion/username-suggestion-service');
var uriLookupService = testRequire('./services/uri-lookup-service');

describe('username-suggestion-service', function() {
  it('should suggest usernames for Andrews email address', function(done) {

    underTest.suggestUsernamesForEmail('andrewn@datatribe.net')
      .then(function(usernameSuggestions) {
        //assert(usernameSuggestions.length > 1);
      })
      .nodeify(done);
  });

  it('should suggest usernames for Mikes email address', function(done) {
    underTest.suggestUsernamesForEmail('mike@hipgeeks.net')
      .then(function(usernameSuggestions) {
        //assert(usernameSuggestions.length >= 1);
      })
      .nodeify(done);
  });



  it('should suggest usernames for seed andrewn', function(done) {
    underTest.suggestUsernames('andrewn')
      .then(function(usernameSuggestions) {
        assert(usernameSuggestions.length >= 1, 'Expected at least one suggestion for andrewn');
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


  var fixture = {};

  var username1 = 'test' + Date.now() + 'mm';
  var username2 = username1 + '1';
  var username3 = username1 + '2';

  before(fixtureLoader(fixture, {
    user1: { username: username1 },
    user2: { username: username2 },
    user3: { username: username3 },
  }));

  after(function() {
    fixture.cleanup();
  });

  it('should suggest a username when another username is taken', function(done) {

    return Q.all([
      uriLookupService.updateUsernameForUserId(fixture.user1.id, null, username1),
      uriLookupService.updateUsernameForUserId(fixture.user2.id, null, username2),
      uriLookupService.updateUsernameForUserId(fixture.user3.id, null, username3)
      ])
      .then(function() {

        return underTest.suggestUsernames(username1)
          .then(function(usernameSuggestions) {

            var original = usernameSuggestions.filter(function(i) { return i.username === username1; })[0];
            var available = usernameSuggestions.filter(function(i) { return i.available; })[0];

            assert.strictEqual(original.available, false);
            assert.strictEqual(available.username, username1 + '3');
          });

      })
      .nodeify(done);

  });




});