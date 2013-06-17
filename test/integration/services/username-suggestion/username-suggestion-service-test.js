/*jslint node: true, unused:true */
/*global describe:true, it: true */
"use strict";

var testRequire = require('../../test-require');

var assert = require('assert');

describe('username-suggestion-service', function() {
  it('should suggest usernames for Andrew', function(done) {
    var underTest = testRequire('./services/username-suggestion/username-suggestion-service');

    underTest.suggestUsernames('andrewn@datatribe.net')
      .then(function(usernameSuggestions) {
        assert(usernameSuggestions.length > 1);
      })
      .nodeify(done);
  });

  it('should suggest usernames for Mike', function(done) {
    var underTest = testRequire('./services/username-suggestion/username-suggestion-service');

    underTest.suggestUsernames('mike@hipgeeks.net')
      .then(function(usernameSuggestions) {
        assert(usernameSuggestions.length == 1);
      })
      .nodeify(done);
  });
});