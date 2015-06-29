/*jslint node:true, unused:true*/
/*global describe:true, it:true */
"use strict";

var testRequire = require('../test-require');
var assert = require('assert');
var FAKE_USER = { username: 'suprememoocow', githubToken: 'bec1f59c0c69d92caca2d8905a7e4c3561d2dbe5'};

var suggestionService = testRequire("./services/suggested-room-service");

describe.skip('suggested-room-service', function() {
  it('should get 8 suggestions #slow', function(done) {
    return suggestionService.getSuggestionsForUser(FAKE_USER)
      .then(function(suggestions) {
        assert(suggestions.length, 8);
      })
      .nodeify(done);
  });
});
