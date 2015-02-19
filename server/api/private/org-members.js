/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var GitHubMeService   = require('../../services/github/github-me-service');
var GitHubOrgService   = require('../../services/github/github-org-service');
var restSerializer     = require("../../serializers/rest-serializer");
var userService        = require('../../services/user-service');
var StatusError        = require('statuserror');
var Q                  = require('q');

/* Only org owners get to call this service */
module.exports = function(req, res, next) {
  var uri = req.params.orgUri;
  var user = req.user;

  return Q.fcall(function() {
      if(!user) throw new StatusError(401);

      if(req.query.on_behalf_of) {
        return userService.findById(req.query.on_behalf_of)
          .then(function(user) {
            if(!user) throw new StatusError(404);

            var ghOrg = new GitHubOrgService(user);
            return ghOrg.members(uri);
          });
      }

      var ghMe = new GitHubMeService(user);
      return ghMe.isOrgAdmin(uri)
        .then(function(isAdmin) {
          if (!isAdmin) throw new StatusError(403);

          var ghOrg = new GitHubOrgService(user);
          return ghOrg.members(uri);
        });
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
      return restSerializer.serializeQ(users, new restSerializer.UserStrategy())
        .then(function(serializeUsers) {
          res.send(serializeUsers);
        });
    })
    .fail(next);
};
