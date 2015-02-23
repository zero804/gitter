'use strict';


var RepoService         = require('./github/github-repo-service');
var OrgService          = require('./github/github-org-service');
var ContributorService  = require('./github/github-contributor-service');
var MeService           = require('./github/github-me-service');
var Q                   = require('q');

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
    .fail(function() {
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
    .fail(function() {
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
    .fail(function() {
      /* Probably don't have access */
      return [];
    });
}

function getCollaboratorsForRepo(repoUri, security, user) {
  if (security === 'PUBLIC') {
    return Q.all([
        getContributors(repoUri, user),   // for public repos
        getCollaborators(repoUri, user),  // for private repos
        getStargazers(repoUri, user)
      ])
      .spread(function(contributors, collaborators, stargazers) {
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
  return ghOrg.members(uri)
    .then(function(orgMembers) {
      return withoutCurrentUser(orgMembers, user);
    });
}

function getCollaboratorsForUser(user) {
  var ghOrg = new OrgService(user);
  var ghMe = new MeService(user);

  return ghMe.getOrgs()
    .then(function(orgs) {
      var promises = orgs.map(function(o) { return ghOrg.members(o.login); });
      return Q.allSettled(promises);
    })
    .then(function (results) {
      var users = [];

      results.forEach(function (result) {
        if (result.state === "fulfilled") users = users.concat(result.value);
      });

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
  var roomType  = room.githubType.split('_')[0];
  var security  = room.security;
  var _uri      = room.uri.split('/');

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
      return Q.resolve([]);
  }


};
