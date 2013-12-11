/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var GitHubRepoService = require('./github/github-repo-service');
var GitHubOrgService   = require('./github/github-org-service');
var assert = require("assert");
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

      // If the user isn't wearing the magic hat, refuse them
      // permission
      if(!user.permissions.createRoom) return false;

      return repoInfo.permissions && repoInfo.permissions.admin;
    });

}

function orgPermissionsModel(user, right, uri) {
  // For now, only authenticated users can be members of orgs
  if(!user) return false;

  var ghOrg = new GitHubOrgService(user);
  return ghOrg.member(uri, user.username)
    .then(function(isMember) {
      // If the user isn't part of the org, always refuse
      // them permission
      if(!isMember) {
        return false;
      }

      if(right === 'create' && !user.permissions.createRoom) return false;

      return true;
    });


}

function permissionsModel(user, right, uri, roomType) {
  function log(x) {
    winston.verbose('Permission', { user: user && user.username, uri: uri, roomType: roomType, granted: x });
    return x;
  }

  assert(user, 'user required');
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
