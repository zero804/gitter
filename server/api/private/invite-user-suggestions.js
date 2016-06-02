'use strict';

var Promise = require('bluebird');
var StatusError = require('statuserror');

var identityService = require('gitter-web-identity');
var RepoService = require('gitter-web-github').GitHubRepoService;
var userScopes = require('gitter-web-identity/lib/user-scopes');
var collaboratorsCore = require('../../services/core/collaborators-core');
var TwitterBackend = require('gitter-web-twitter-backend');

var convertGitHubUserResultToGitterUsers = function(githubUsers) {
  return githubUsers.map(function(githubUser) {
    return {
      username: githubUser.login,
      displayName: githubUser.login,
      githubId: githubUser.id
    };
  });
};


var convertTwitterUserResultToGitterUsers = function(twitterUsers) {
  return twitterUsers.map(function(twitterUser) {
    return {
      username: twitterUser.screen_name,
      displayName: twitterUser.name,
      twitterId: twitterUser.id
    };
  });
};

var getGithubSuggestions = function(type, linkPath, user) {
  if(type === 'GH_REPO' && linkPath) {
    var ghRepo = new RepoService(user);
    return ghRepo.getRepo(linkPath)
      .then(function(repoInfo) {
        if(repoInfo) {
          return collaboratorsCore.getCollaboratorsForRepo(linkPath, repoInfo.private ? 'PRIVATE' : 'PUBLIC', user, {
            firstPageOnly: true
          });
        }

        throw new StatusError(404, 'Could not find repo provided in `linkPath`: ' + linkPath);
      })
      // Sort by the number of contributions to the project descending
      .then(function(results) {
        return results.sort(function(a, b) {
          if((!a.contributions && b.contributions) || a.contributions < b.contributions) {
            return 1;
          }
          else if((a.contributions && !b.contributions) || a.contributions > b.contributions) {
            return -1;
          }

          return 0;
        })
      })
      .then(convertGitHubUserResultToGitterUsers);
  }
  else if(type === 'GH_ORG' && linkPath) {
    return collaboratorsCore.getCollaboratorsForOrg(linkPath, user, {
      firstPageOnly: true
    })
    .then(convertGitHubUserResultToGitterUsers);
  }
  else if(!type) {
    return collaboratorsCore.getCollaboratorsForUser(user, {
      firstPageOnly: true
    })
    .then(convertGitHubUserResultToGitterUsers);
  }

  return Promise.resolve([]);
};

var getTwitterSuggestions = function(type, linkPath, user) {
  return identityService.getIdentityForUser(user, 'twitter')
    .then(function(twitterIdentity) {
      if(twitterIdentity) {
        var twitterBackend = new TwitterBackend(user, twitterIdentity);
        return twitterBackend.getFollowers();
      }

      return Promise.resolve([]);
    })
    // Sort by the number of followers descending
    .then(function(results) {
      return results.sort(function(a, b) {
        if(a.followers_count < b.followers_count) {
          return 1;
        }
        else if(a.followers_count > b.followers_count) {
          return -1;
        }

        return 0;
      })
    })
    .then(convertTwitterUserResultToGitterUsers);
};


var getUserSuggestions = function(type, linkPath, user) {
  var isGitHubUser = userScopes.isGitHubUser(user);
  var isTwitterUser = user.identities.some(function(identity) {
    return identity.provider === 'twitter';
  });

  if(isGitHubUser) {
    return getGithubSuggestions(type, linkPath, user);
  }
  else if(isTwitterUser) {
    return getTwitterSuggestions(type, linkPath, user);
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
