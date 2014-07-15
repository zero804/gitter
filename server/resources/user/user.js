/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var restSerializer = require("../../serializers/rest-serializer");
var userService = require("../../services/user-service");
var userSearchService = require("../../services/user-search-service");
var githubSearchService = require("../../services/github/github-fast-search");
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


module.exports = {
  id: 'resourceUser',
  index: function(req, res, next) {
    if(!req.user) {
      return next(403);
    }

    if(req.query.q) {

      var searchQuery = req.query.q;
      var userId = req.user.id;
      var limit = req.query.limit;
      var skip = req.query.skip;
      var excludeTroupeId = req.query.excludeTroupeId;

      return Q([
          searchGitterUsers(searchQuery, userId, excludeTroupeId, limit, skip),
          searchGithubUsers(searchQuery, req.user)
        ])
        .spread(function(gitterResults, githubResults) {
          gitterResults.results = gitterResults.results.concat(githubResults);
          return gitterResults;
        })
        .then(function(searchResults) {
          var strategy = new restSerializer.SearchResultsStrategy({
            resultItemStrategy: new restSerializer.UserStrategy()
          });

          return restSerializer.serializeQ(searchResults, strategy);
        }).then(function(searchResults) {
          res.send(searchResults);
        })
        .fail(next);
    }

    var strategy = new restSerializer.UserStrategy();
    restSerializer.serialize(req.user, strategy, function(err, serialized) {
      if(err) return next(err);

      res.send([serialized]);
    });
  },

  show: function(req, res, next) {
    var strategy = new restSerializer.UserStrategy();

    restSerializer.serialize(req.resourceUser, strategy, function(err, serialized) {
      if(err) return next(err);

      res.send(serialized);
    });
  },

  load: function(req, id, callback) {
    if(!req.user) return callback(401);
    if(id === 'me') {
      id = req.user.id;
    } else {
      // TODO: can the currently logged in user view information about this other user?
      // For the moment, you'll only be able to see your own information
      if(req.user.id != id) return callback(403);
    }

    userService.findById(id, callback);
  }

};
