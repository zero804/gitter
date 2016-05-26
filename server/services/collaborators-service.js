'use strict';


var RepoService = require('gitter-web-github').GitHubRepoService;
var OrgService = require('gitter-web-github').GitHubOrgService;
var ContributorService = require('gitter-web-github').GitHubContributorService;
var MeService = require('gitter-web-github').GitHubMeService;
var Promise = require('bluebird');

function withoutCurrentUser(users, user) {
  if (!users || !users.length) return [];

  return users.filter(function(u) { return u.login !== user.username; });
}

function getContributors(uri, user) {
  var ghRepo = new ContributorService(user);
  return ghRepo.getContributors(uri)
    .then(function(contributors) {
      return withoutCurrentUser(contributors, user);
    })
    .catch(function() {
      /* Probably don't have access */
      return [];
    });
}

function getCollaborators(uri, user) {
  var ghRepo = new RepoService(user);
  return ghRepo.getCollaborators(uri)
    .then(function(collaborators) {
      return withoutCurrentUser(collaborators, user);
    })
    .catch(function() {
      /* Probably don't have access */
      return [];
    });
}

function getStargazers(uri, user) {
  var ghRepo = new RepoService(user);
  return ghRepo.getStargazers(uri)
    .then(function(stargazers) {
      return withoutCurrentUser(stargazers, user);
    })
    .catch(function() {
      /* Probably don't have access */
      return [];
    });
}

function getCollaboratorsForRepo(repoUri, security, user) {
  if (security === 'PUBLIC') {
    return Promise.join(
        getContributors(repoUri, user),   // for public repos
        getCollaborators(repoUri, user),  // for private repos
        getStargazers(repoUri, user),
        function(contributors, collaborators, stargazers) {
          var related = contributors.concat(collaborators).concat(stargazers);
          if (related.length) {
            return related;
          }

          return getCollaboratorsForUser(user);
        });
  }

  /* INHERITED and PRIVATE rooms */
  return getCollaborators(repoUri, user);
}

function getCollaboratorsForOrg(uri, user) {
  var ghOrg = new OrgService(user);
  return ghOrg.someMembers(uri)
    .then(function(orgMembers) {
      return withoutCurrentUser(orgMembers, user);
    });
}

function getCollaboratorsForUser(user) {
  var ghOrg = new OrgService(user);
  var ghMe = new MeService(user);

  return ghMe.getOrgs()
    .then(function(orgs) {
      return Promise.map(orgs, function(org) {
        return ghOrg.someMembers(org.login).reflect();
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
    });

}

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

module.exports = function getCollaboratorForRoom(room, user) {
  var roomType = room.githubType.split('_')[0];
  var security = room.security;
  var _uri = room.uri.split('/');

  switch(roomType) {
    case 'REPO': // REPOs and REPO_CHANNELs
      var repoUri = _uri[0] + '/' + _uri[1];
      return getCollaboratorsForRepo(repoUri, security, user)
        .then(deduplicate);

    case 'ORG': // ORGs and ORG_CHANNELs
      var orgUri = _uri[0];
      return getCollaboratorsForOrg(orgUri, user)
        .then(deduplicate);

    case 'USER': // USER_CHANNELs
      return getCollaboratorsForUser(user)
        .then(deduplicate);

    default:
      return Promise.resolve([]);
  }


};
