/* jshint node:true, unused:strict */
"use strict";

var userSearchService = require("./user-search-service");
var githubSearchService = require("./github/github-fast-search");
var Q = require('q');
var _ = require('underscore');


function searchGitterUsers(query, searcherId, excludeTroupeId, limit, skip, callback) {
  var options = {
    limit: limit,
    skip: skip,
    excludeTroupeId: excludeTroupeId
  };

  return userSearchService.searchForUsers(searcherId, query, options)
    .nodeify(callback);
}

function searchGithubUsers(query, user, callback) {
  var search = new githubSearchService(user);
  return search.findUsers(query).then(function(users) {
    var results = users.map(function (user) {
      return {
        username: user.login,
        gravatarImageUrl: user.avatar_url,
        getDisplayName: function() {},
        getHomeUrl: function() {}
      };
    });

    return results;
  }).nodeify(callback);
}

function mergeResultArrays(gitterUsers, githubUsers, excludedUsername) {
  var merged = gitterUsers.concat(githubUsers);
  var noSelfMentions = merged.filter(function(user) { return user.username != excludedUsername });
  var deduplicated = _.uniq(noSelfMentions, false, function(user) { return user.username; });
  return deduplicated;
}

module.exports = function(searchQuery, user, excludeTroupeId, limit, skip, callback) {
  return Q([
    searchGitterUsers(searchQuery, user.id, excludeTroupeId, limit, skip),
    searchGithubUsers(searchQuery, user)
  ])
  .spread(function(gitterResults, githubResults) {
    gitterResults.results = mergeResultArrays(gitterResults.results, githubResults, user.username);
    return gitterResults;
  })
  .nodeify(callback);
};
