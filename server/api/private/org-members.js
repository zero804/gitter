"use strict";

var GitHubMeService  = require('gitter-web-github').GitHubMeService;
var GitHubOrgService = require('gitter-web-github').GitHubOrgService;
var restSerializer   = require("../../serializers/rest-serializer");
var userService      = require('../../services/user-service');
var StatusError      = require('statuserror');
var Promise          = require('bluebird');

function listOrgMembers(user, uri) {
  var ghMe = new GitHubMeService(user);
  return ghMe.isOrgAdmin(uri)
    .then(function(isAdmin) {
      if (!isAdmin) throw new StatusError(403);

      var ghOrg = new GitHubOrgService(user);
      return ghOrg.members(uri);
    });
}

/* Only org owners get to call this service */
module.exports = function(req, res, next) {
  var uri = req.params.orgUri;
  var user = req.user;

  return Promise.try(function() {
      if(!user) throw new StatusError(401);

      if(req.query.on_behalf_of) {
        return userService.findById(req.query.on_behalf_of)
          .then(function(user) {
            if(!user) throw new StatusError(404);
            return listOrgMembers(user, uri);
          });
      }

      return listOrgMembers(req.user, uri);
    })
    .then(function(orgMembers) {
      var usernames = orgMembers.map(function(user) { return user.login; });
      return userService.findByUsernames(usernames);
    })
    .then(function(users) {
      return users.filter(function(user) { return !user.state; });
    })
    .then(function(users) {
      if(req.query.count_only)
        return res.send({ count: users.length });

      /* Return the actual users */
      return restSerializer.serialize(users, new restSerializer.UserStrategy())
        .then(function(serializeUsers) {
          res.send(serializeUsers);
        });
    })
    .catch(next);
};
