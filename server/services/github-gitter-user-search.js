/* jshint node:true, unused:strict */
"use strict";

var userSearchService = require("./user-search-service");
var userService = require("./user-service");
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
  })
  .nodeify(callback);
}

function addGitterDataToGithubUsers(githubUsers, callback) {
  var usernames = githubUsers.map(function(user) {
    return user.username;
  });

  return userService.githubUsersExists(usernames)
    .then(function(existsHash) {

      var gitterUsernames = Object.keys(existsHash).filter(function(username) {
        return !!existsHash[username];
      });

      return gitterUsernames;
    })
    .then(userService.findByUsernames)
    .then(function(gitterUsers) {

      var map = {};
      gitterUsers.forEach(function(user) {
        map[user.username] = user;
      });

      var augmentedGithubUsers = githubUsers.map(function(githubUser) {
        return map[githubUser.username] || githubUser;
      });

      return augmentedGithubUsers;
    });
}

module.exports = function(searchQuery, user, excludeTroupeId, limit, skip, callback) {
  return Q([
    searchGitterUsers(searchQuery, user.id, excludeTroupeId, limit, skip),
    searchGithubUsers(searchQuery, user).then(addGitterDataToGithubUsers)
  ])
  .spread(function(gitterResults, githubUsers) {
    var gitterUsers = gitterResults.results
    var excludedUsername = user.username;

    var merged = gitterUsers.concat(githubUsers);
    var noSelfMentions = merged.filter(function(user) {
      return user.username != excludedUsername
    });
    var deduplicated = _.uniq(noSelfMentions, false, function(user) {
      return user.username;
    });
    var limited = deduplicated.slice(0, limit);

    gitterResults.results = limited
    return gitterResults;
  })
  .nodeify(callback);
};
