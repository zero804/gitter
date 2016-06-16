"use strict";

var assert = require('assert');
var gitHubInviteUserSuggestionsService = require('../lib/github-invite-user-suggestions.js');

var FAKE_USER = { username: 'gittertestbot', githubToken: '***REMOVED***'};

describe('github-invite-user-suggestions', function() {
  it('should return suggestions for a PUBLIC REPO', function() {
    return gitHubInviteUserSuggestionsService('GH_REPO', 'gitterHQ/gitter', FAKE_USER)
      .then(function(userSuggestions) {
        assert(Array.isArray(userSuggestions));
        assert(userSuggestions.length > 0);
      });
  });
  it('should return suggestions for a PRIVATE REPO', function() {
    return gitHubInviteUserSuggestionsService('GH_REPO', 'troupe/gitter-webapp', FAKE_USER)
      .then(function(userSuggestions) {
        assert(Array.isArray(userSuggestions));
        assert(userSuggestions.length > 0);
      });
  });
  it('should return suggestions for a unknown REPO', function() {
    return gitHubInviteUserSuggestionsService('GH_REPO', 'troupe/xyz', FAKE_USER)
      .then(function(userSuggestions) {
        assert(Array.isArray(userSuggestions));
        assert(userSuggestions.length > 0);
      });
  });
  it('should return suggestions for a ORG', function() {
    return gitHubInviteUserSuggestionsService('GH_ORG', 'troupe', FAKE_USER)
      .then(function(userSuggestions) {
        assert(Array.isArray(userSuggestions));
        assert(userSuggestions.length > 0);
      });
  });
  it('should return suggestions for a PUBLIC USER channel', function() {
    return gitHubInviteUserSuggestionsService('GH_USER', 'gitterHQ/developers', FAKE_USER)
      .then(function(userSuggestions) {
        assert(Array.isArray(userSuggestions));
        assert(userSuggestions.length > 0);
      });
  });
  it('should return suggestions for a ORGANISATION USER channel (inherited)', function() {
    return gitHubInviteUserSuggestionsService('GH_USER', 'gitterHQ/devops', FAKE_USER)
      .then(function(userSuggestions) {
        assert(Array.isArray(userSuggestions));
        assert(userSuggestions.length > 0);
      });
  });
  it('should return suggestions for a PRIVATE USER channel', function() {
    return gitHubInviteUserSuggestionsService('GH_USER', 'troupe/for-tests', FAKE_USER)
      .then(function(userSuggestions) {
        assert(Array.isArray(userSuggestions));
        assert(userSuggestions.length > 0);
      });
  });
});
