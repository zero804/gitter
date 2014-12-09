/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

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

      var ghOrg = new GitHubOrgService(req.user);
      return ghOrg.getOwners(uri)
        .then(function(owners) {
          // If the user requesting the members list happens to be one of the owners  we'll return a
          // list of the org members that are also Gitter users, just that intersection.
          if (!owners.some(function(owner) { return owner.login === user.username; }))
            throw new StatusError(403);

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
