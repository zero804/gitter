'use strict';

var Promise = require('bluebird');

var RepoService = require('gitter-web-github').GitHubRepoService;
var userScopes = require('gitter-web-identity/lib/user-scopes');
var collaboratorsCore = require('../../services/core/collaborators-core');

var getUserSuggestions = function(type, linkPath, user) {
  var isGitHubUser = userScopes.isGitHubUser(user);

  if(isGitHubUser && type === 'GH_REPO' && linkPath) {
    var ghRepo = new RepoService(user);
    return ghRepo.getRepo(linkPath)
      .then(function(repoInfo) {
        return collaboratorsCore.getCollaboratorsForRepo(linkPath, repoInfo.private ? 'PRIVATE' : 'PUBLIC', user, {
          firstPageOnly: true
        });
      });
  }
  else if(isGitHubUser && type === 'GH_ORG' && linkPath) {
    return collaboratorsCore.getCollaboratorsForOrg(linkPath, user, {
      firstPageOnly: true
    })
  }
  else if(isGitHubUser && !type) {
    return collaboratorsCore.getCollaboratorsForUser(user, {
      firstPageOnly: true
    })
  }

  return Promise.resolve([]);
}


var resolveInviteUserSuggestions = function(req, res, next) {
  // null, 'GH_REPO', 'GH_ORG'
  var type = req.query.type;
  var linkPath = req.query.linkPath;
  var user = req.user;

  return getUserSuggestions(type, linkPath, user)
    .then(function(suggestions) {
      res.send(suggestions);
    })
    .catch(next);
};

module.exports = resolveInviteUserSuggestions;
