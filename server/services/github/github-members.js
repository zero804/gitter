/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var GithubRepoService = require('./github-repo-service');
var GithubOrgService = require('./github-org-service');
var Q = require('q');

function getRepoMembers(uri, githubTokenUser) {
  var repo = new GithubRepoService(githubTokenUser);
    return repo.getCollaborators(uri)
      .then(function(collaborators) {
        return collaborators.map(function(collaborator) {
          return collaborator.login;
        });
      });
}

function getOrgMembers(uri, githubTokenUser) {
  var org = new GithubOrgService(githubTokenUser);
    return org.members(uri)
      .then(function(members) {
        return members.map(function(members) {
          return members.login;
        });
      });
}

function getMembers(uri, githubType, githubTokenUser) {
  if(githubType === 'REPO') {
    return getRepoMembers(uri, githubTokenUser);
  } else if(githubType === 'ORG') {
    return getOrgMembers(uri, githubTokenUser);
  } else {
    return Q.reject(new Error('unknown githubType "'+githubType+'"'));
  }
}

function isMember(username, uri, githubType, githubTokenUser) {
  return getMembers(uri, githubType, githubTokenUser)
    .then(function(members) {
      return members.indexOf(username) >= 0;
    });
}

module.exports.getMembers = getMembers;
module.exports.isMember = isMember;
