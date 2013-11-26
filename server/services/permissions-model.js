/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var GitHubRepoService = require('./github/github-repo-service');
var GitHubUserService = require('./github/github-user-service');
var assert = require("assert");
var _ = require("underscore");
var Q = require('q');
var winston = require('winston');

function repoPermissionsModel(user, right, uri) {
  // For now, only authenticated users can be members of orgs
  if(!user) return false;

  var repoService = new GitHubRepoService(user);
  return repoService.getRepo(uri)
    .then(function(repoInfo) {
      /* Can't see the repo? no access */
      if(!repoInfo) return false;

      if(right === 'join') return true;

      assert.equal(right, 'create');

      return repoInfo.permissions && repoInfo.permissions.admin;
    });

}

function orgPermissionsModel(user, right, uri) {
  // For now, only authenticated users can be members of orgs
  if(!user) return false;


  var ghuser = new GitHubUserService(user);
  return ghuser.getOrgs()
    .then(function(orgs) {
      uri = uri.toLowerCase();

      var org = _.find(orgs, function(org) { return org.login && org.login.toLowerCase() === uri; });

      return !!org;
    });


}

function permissionsModel(user, right, uri, roomType) {

  function log(x) {
    winston.verbose('Permission', { user: user && user.username, uri: uri, roomType: roomType, granted: x });
    return x;
  }

  assert(!user || user.githubToken, 'User must have a githubToken');
  assert(right, 'right required');
  assert(right === 'create' ||
    right === 'join', 'Invalid right ' + right);
  assert(uri, 'uri required');
  assert(roomType, 'roomType required');
  assert(roomType === 'REPO' ||
    roomType === 'ORG' ||
    roomType === 'ONETOONE', 'Invalid roomType ' + roomType);

  switch(roomType) {
    case 'REPO':
      return repoPermissionsModel(user, right, uri).then(log);

    case 'ORG':
      return orgPermissionsModel(user, right, uri).then(log);

    case 'ONETOONE':
      // TODO: a one-to-one permissioning model
      return true;
  }

}

module.exports = permissionsModel;
