/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var GithubRepoService = require('./github-repo-service');
var GithubOrgService = require('./github-org-service');
var Q = require('q');

function getRepoMembers(uri, instigatingUser) {
  var repo = new GithubRepoService(instigatingUser);
  return repo.getCollaborators(uri)
    .then(function(collaborators) {
      return collaborators.map(function(collaborator) {
        return collaborator.login;
      });
    });
}

function getOrgMembers(uri, instigatingUser) {
  var org = new GithubOrgService(instigatingUser);
  return org.members(uri)
    .then(function(members) {
      return members.map(function(members) {
        return members.login;
      });
    });
}

function getMembers(uri, githubType, instigatingUser) {
  if(githubType === 'REPO') {
    return getRepoMembers(uri, instigatingUser);
  } else if(githubType === 'ORG') {
    return getOrgMembers(uri, instigatingUser);
  } else {
    return Q.reject(new Error('unknown githubType "'+githubType+'"'));
  }
}

module.exports.getMembers = getMembers;

function isMember(username, uri, githubType, instigatingUser) {
  return getMembers(uri, githubType, instigatingUser)
    .then(function(members) {
      return members.indexOf(username) >= 0;
    });
}

module.exports.isMember = isMember;
