/* jshint node:true, unused:strict */
"use strict";

var userSearchService = require("./user-search-service");
var githubSearchService = require("./github/github-fast-search");
var Q = require('q');


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

module.exports = function(searchQuery, user, excludeTroupeId, limit, skip, callback) {
  return Q([
    searchGitterUsers(searchQuery, user.id, excludeTroupeId, limit, skip),
    searchGithubUsers(searchQuery, user)
  ])
  .spread(function(gitterResults, githubResults) {
    gitterResults.results = gitterResults.results.concat(githubResults);
    return gitterResults;
  })
  .nodeify(callback);
};