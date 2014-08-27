/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var RepoService = require('../../services/github/github-repo-service');
var OrgService = require('../../services/github/github-org-service');


module.exports = {
  id: 'resourceTroupeUser',

  index: function(req, res) {
    var roomType  = req.troupe.githubType.split('_')[0];
    var _uri      = req.troupe.uri.split('/');

    switch(roomType) {
      case 'REPO':
        var repoUri = _uri[0] + '/' + _uri[1];
        var ghRepo = new RepoService(req.user);
        return ghRepo.getCollaborators(repoUri)
        .then(function(contributors) {
          var filtered = contributors.filter(function(c) { return c.login !== req.user.username; });
          return res.send(filtered);
        });

      case 'ORG':
        var orgUri = _uri[0];
        var ghOrg = new OrgService(req.user);
        return ghOrg.members(orgUri)
        .then(function(contributors) {
          var filtered = contributors.filter(function(c) { return c.login !== req.user.username; });
          return res.send(filtered);
        });

      default:
        res.send([]);
    }
  }

};
