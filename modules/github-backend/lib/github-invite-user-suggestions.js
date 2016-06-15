'use strict';

var Promise = require('bluebird');

var collaboratorsService = require('./github-collaborators-service');


function convertGitHubUserResultToGitterUsers(githubUsers) {
  return githubUsers.map(function(githubUser) {
    return {
      username: githubUser.login,
      displayName: githubUser.login,
      githubId: githubUser.id
    };
  });
}


function getGithubSuggestions(type, linkPath, user) {
  if(type === 'GH_REPO' && linkPath) {
    return collaboratorsService.getCollaboratorsForRepo(linkPath, 'PUBLIC', user, {
        firstPageOnly: true
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
    return collaboratorsService.getCollaboratorsForOrg(linkPath, user, {
      firstPageOnly: true
    })
    .then(convertGitHubUserResultToGitterUsers);
  }
  else if(type === 'GH_USER' || !type) {
    return collaboratorsService.getCollaboratorsForUser(user, {
      firstPageOnly: true
    })
    .then(convertGitHubUserResultToGitterUsers);
  }

  return Promise.resolve([]);
}


module.exports = getGithubSuggestions;
