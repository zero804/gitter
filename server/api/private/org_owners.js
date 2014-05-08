/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var GitHubOrgService = require('../../services/github/github-org-service');

module.exports = function(req, res) {
  var uri = req.params.orgUri;

  var ghOrg = new GitHubOrgService(req.user);
  return ghOrg.getOwners(uri).then(function(members) {
    res.send(members); 
  }).fail(function(err) {
    res.send(400, err);
  });
};
