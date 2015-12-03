"use strict";

var Mirror      = require('gitter-web-github').GitHubMirrorService('user');
var userService = require("../../services/user-service");
var restSerializer = require("../../serializers/rest-serializer");
var userScopes = require("../../utils/models/user-scopes");
var StatusError = require('statuserror');

module.exports = function getUserProfile(req, res, next) {
  if (!req.params || !req.params.username) return next(new StatusError(404));

  var username = req.params.username;
  userService.findByUsername(username)
    .then(function(user) {
      if (user) {
        var strategy = new restSerializer.UserProfileStrategy();
        return restSerializer.serialize(user, strategy);

      } else {
        var githubUri = 'users/' + username;
        var githubUser = {username: username};

        if (!userScopes.isGitHubUser(githubUser)) {
          return next(new StatusError(404));
        }

        var mirror = new Mirror(githubUser);

        return mirror.get(githubUri)
          .then(function (body) {
            if (!body || !body.login) throw new StatusError(404);

            var blogUrl;
            if (body.blog) {
              if (!body.blog.match(/^https?:\/\//)) {
                blogUrl = 'http://' + body.blog;
              } else {
                blogUrl = body.blog;
              }
            }

            var profile = {
              username: body.login,
              displayName: body.name
            };

            profile.company = body.company;
            profile.location = body.location;
            profile.email = body.email;
            profile.website = blogUrl;
            profile.profile = body.html_url;

            return profile;
          });
      }
    })
    .then(function(response) {
      res.send(response);
    })
    .catch(next);

};
