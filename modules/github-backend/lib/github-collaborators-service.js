'use strict';

var Promise = require('bluebird');
var RepoService = require('gitter-web-github').GitHubRepoService;
var OrgService = require('gitter-web-github').GitHubOrgService;
var ContributorService = require('gitter-web-github').GitHubContributorService;
var MeService = require('gitter-web-github').GitHubMeService;
var getOrgNameFromTroupeName = require('gitter-web-shared/get-org-name-from-troupe-name');



function deduplicate(collaborators) {
  var deduped = [];
  var logins = {};
  collaborators.forEach(function(collaborator) {
    if (!collaborator) return;
    if (logins[collaborator.login]) return;
    logins[collaborator.login] = 1;
    deduped.push(collaborator);
  });
  return deduped;
}

function withoutCurrentUser(users, user) {
  if (!users || !users.length) return [];

  return users.filter(function(u) { return u.login !== user.username; });
}

function getContributors(uri, user, options) {
  var ghRepo = new ContributorService(user);
  return ghRepo.getContributors(uri, options)
    .then(function(contributors) {
      return withoutCurrentUser(contributors, user);
    })
    .catch(function() {
      /* Probably don't have access */
      return [];
    });
}

function getCollaborators(uri, user, options) {
  var ghRepo = new RepoService(user);
  return ghRepo.getCollaborators(uri, options)
    .then(function(collaborators) {
      return withoutCurrentUser(collaborators, user);
    })
    .catch(function() {
      /* Probably don't have access */
      return [];
    });
}

function getStargazers(uri, user, options) {
  var ghRepo = new RepoService(user);
  return ghRepo.getStargazers(uri, options)
    .then(function(stargazers) {
      return withoutCurrentUser(stargazers, user);
    })
    .catch(function() {
      /* Probably don't have access */
      return [];
    });
}

function getCollaboratorsForRepo(repoUri, security, user, options) {
  if (security === 'PUBLIC') {
    return Promise.join(
        getContributors(repoUri, user, options),   // for public repos
        getCollaborators(repoUri, user, options),  // for private repos
        getStargazers(repoUri, user, options),
        function(contributors, collaborators, stargazers) {
          var related = contributors.concat(collaborators).concat(stargazers);
          if (related.length) {
            return related;
          }

          return getCollaboratorsForUser(user, options);
        })
        .then(deduplicate);
  }

  /* INHERITED and PRIVATE rooms */
  return getCollaborators(repoUri, user, options);
}

function getCollaboratorsForOrg(uri, user, options) {
  uri = getOrgNameFromTroupeName(uri);
  var ghOrg = new OrgService(user);
  // Already using firstPageOnly
  return ghOrg.someMembers(uri, options)
    .then(function(orgMembers) {
      return withoutCurrentUser(orgMembers, user);
    });
}

function getCollaboratorsForUser(user, options) {
  var ghOrg = new OrgService(user);
  var ghMe = new MeService(user);

  return ghMe.getOrgs()
    .then(function(orgs) {
      return Promise.map(orgs, function(org) {
        return ghOrg.someMembers(org.login, options).reflect();
      });
    })
    .then(function (results) {
      var users = results
        .filter(function(inspection) {
          return inspection.isFulfilled();
        })
        .reduce(function(memo, inspection) {
          memo = memo.concat(inspection.value());
          return memo;
        },[]);

      return withoutCurrentUser(users, user);
    })
    .then(deduplicate);

}


module.exports = {
  getContributors: getContributors,
  getCollaborators: getCollaborators,
  getStargazers: getStargazers,
  getCollaboratorsForRepo: getCollaboratorsForRepo,
  getCollaboratorsForOrg: getCollaboratorsForOrg,
  getCollaboratorsForUser: getCollaboratorsForUser
};
