"use strict";

var userService = require("../../services/user-service");
var restSerializer = require("../../serializers/rest-serializer");
var userScopes = require("../../utils/models/user-scopes");
var StatusError = require('statuserror');
var gitHubProfileService = require('../../backends/github/github-profile-service');

module.exports = function getUserProfile(req, res, next) {
  if (!req.params || !req.params.username) return next(new StatusError(404));

  var username = req.params.username;
  userService.findByUsername(username)
    .then(function(user) {
      if (user) {
        var strategy = new restSerializer.UserProfileStrategy();
        return restSerializer.serialize(user, strategy);

      } else {
        var gitHubUser = {username: username};

        if (!userScopes.isGitHubUser(gitHubUser)) {
          return next(new StatusError(404));
        }

        return gitHubProfileService(gitHubUser, true);
      }
    })
    .then(function(response) {
      res.send(response);
    })
    .catch(next);

};
