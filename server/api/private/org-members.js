/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var GitHubOrgService   = require('../../services/github/github-org-service');
var restSerializer     = require("../../serializers/rest-serializer");
var userService        = require('../../services/user-service');
var StatusError        = require('statuserror');

/* Only org owners get to call this service */
module.exports = function(req, res, next) {
  var uri = req.params.orgUri;
  var user = req.user;

  if(!user) return next(401);

  var ghOrg = new GitHubOrgService(req.user);
  return ghOrg.getOwners(uri)
    .then(function(owners) {
      // If the user requesting the members list happens to be one of the owners  we'll return a
      // list of the org members that are also Gitter users, just that intersection.
      if (!owners.some(function(owner) { return owner.login === user.username; }))
        throw new StatusError(403);

      return ghOrg.members(uri);
    })
    .then(function(orgMembers) {
      var usernames = orgMembers.map(function(user) { return user.login; });
      return userService.findByUsernames(usernames);
    })
    .then(function(users) {
      return users.filter(function(user) { return user.isActive(); });
    })
   .then(function(users) {
     return restSerializer.serializeQ(users, new restSerializer.UserStrategy());
    })
    .then(function(serializeUsers) {
      res.send(serializeUsers);
    })


    .fail(next);
};
