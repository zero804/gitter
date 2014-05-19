/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var GitHubOrgService = require('../../services/github/github-org-service');
var persistenceService = require('../../services/persistence-service');
var restSerializer = require("../../serializers/rest-serializer");

module.exports = function(req, res, next) {
  var uri = req.params.orgUri;

  var ghOrg = new GitHubOrgService(req.user);
  return ghOrg.getOwners(uri).then(function(members) {

    // If the user requesting the members list happens to be one of the owners  we'll return a 
    // list of the org members that are also Gitter users, just that intersection.
    if (members.some(function(member) { return member.login === req.user.username; })) {

      ghOrg.members(uri).then(function(orgMembers) {
        var usernames = orgMembers.map(function(user) { return user.login; });
        persistenceService.User.findQ({username: {$in: usernames}}).then(function(users) {

          var strategy = new restSerializer.UserStrategy();
          restSerializer.serialize(users, strategy, function(err, serialized) {
            if(err) return next(err);
            res.send(serialized);
          });
        });
      });

    } else {
      res.send([]);
    }
  
  }).fail(function(err) {
    return next(err);
  });
};
