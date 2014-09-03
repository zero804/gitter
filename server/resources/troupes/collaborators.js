/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var RepoService         = require('../../services/github/github-repo-service');
var OrgService          = require('../../services/github/github-org-service');
var ContributorService  = require('../../services/github/github-contributor-service');
var MeService           = require('../../services/github/github-me-service');
var Q                   = require('q');

function withoutCurrentUser(users, user) {
  return users.filter(function(u) { return u.login !== user.username; });
}

function getContributors(uri, user) {
  var ghRepo = new ContributorService(user);
  return ghRepo.getContributors(uri)
  .then(function(contributors) {
    return withoutCurrentUser(contributors, user);
  });
}

function getCollaborators(uri, user) {
  var ghRepo = new RepoService(user);
  return ghRepo.getCollaborators(uri)
  .then(function(collaborators) {
    return withoutCurrentUser(collaborators, user);
  });
}

function getStargazers(uri, user) {
  var ghRepo = new RepoService(user);
  return ghRepo.getStargazers(uri)
  .then(function(stargazers) {
    return withoutCurrentUser(stargazers, user);
  });
}

function getOrgMembers(uri, user) {
  var ghOrg = new OrgService(user);
  return ghOrg.members(uri)
  .then(function(orgMembers) {
    return withoutCurrentUser(orgMembers, user);
  });
}

function getMembersFromUserOrgs(user) {
  var ghOrg = new OrgService(user);
  var ghMe = new MeService(user);
  return ghMe.getOrgs()
  .then(function(orgs) {
    var promises = orgs.map(function(o) { return ghOrg.members(o.login); });
    return Q.allSettled(promises)
    .then(function (results) {
      var users = [];
      results.forEach(function (result) {
        if (result.state === "fulfilled") users = users.concat(result.value);
      });
      return withoutCurrentUser(users, user);
    });
  });
}


module.exports = {
  id: 'resourceTroupeUser',

  index: function(req, res) {
    var roomType  = req.troupe.githubType.split('_')[0];
    var _uri      = req.troupe.uri.split('/');

    switch(roomType) {
      case 'REPO': // REPOs and REPO_CHANNELs
        var repoUri = _uri[0] + '/' + _uri[1];

        Q.all([
          getContributors(repoUri, req.user),   // for public repos
          getCollaborators(repoUri, req.user),  // for private repos
          getStargazers(repoUri, req.user)
        ])
        .spread(function(contributors, collaborators, stargazers) {
          var related = contributors.concat(collaborators).concat(stargazers);
          if (related.length) {
            return related;
          } else {
            return getMembersFromUserOrgs(req.user); 
          }
        })
        .then(function(recommendedUsers) {
          return res.send(recommendedUsers);
        });
        break;

      case 'ORG': // ORGs and ORG_CHANNELs
        var orgUri = _uri[0];

        getOrgMembers(orgUri, req.user)
        .then(function(recommendedUsers) {
          return res.send(recommendedUsers);
        });
        break;

      case 'USER': // USER_CHANNELs

        getMembersFromUserOrgs(req.user)
        .then(function(recommendedUsers) {
          return res.send(recommendedUsers);
        });
        break;

      default:
        res.send([]);
    }
  }

};
