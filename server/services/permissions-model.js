/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var GitHubRepoService  = require('./github/github-repo-service');
var GitHubOrgService   = require('./github/github-org-service');
var assert             = require("assert");
var winston            = require('winston');
var Q                  = require('q');

function repoPermissionsModel(user, right, uri) {
  // For now, only authenticated users can be members of orgs
  if(!user) return false;

  var repoService = new GitHubRepoService(user);
  return repoService.getRepo(uri)
    .then(function(repoInfo) {
      /* Can't see the repo? no access */
      if(!repoInfo) return false;

      if(right === 'join') return true;

      /* Need admin permission from here on out */
      if(!repoInfo.permissions || !repoInfo.permissions.admin) {
        return false;
      }

      if(right === 'create') {
        // If the user isn't wearing the magic hat, refuse them
        // permission
        if(!user.permissions.createRoom) return false;

        return true;
      }

      if(right === 'admin') {
        return repoInfo.permissions && repoInfo.permissions.push;
      }

      assert(false, 'Unknown right ' + right);
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

      if(right === 'create') {
        // If the user isn't wearing the magic hat, refuse them
        // permission
        return user.permissions.createRoom;
      }

      if(right === 'admin' || right === 'join') {
        return true;
      }

      assert(false, 'Unknown right ' + right);
    });
}

function orgChannelPermissionsModel(user, right, uri) {
  var orgUri = uri.replace(/\/\*.*$/,'');
  winston.verbose('Proxying permission on ' + uri + ' to org permission on ' + orgUri, { user: user && user.username, right: right });
  return orgPermissionsModel(user, right, orgUri);
}

function repoChannelPermissionsModel(user, right, uri) {
  var repoUri = uri.replace(/\/\*.*$/,'');
  winston.verbose('Proxying permission on ' + uri + ' to repo permission on ' + repoUri, { user: user && user.username, right: right });
  return repoPermissionsModel(user, right, repoUri);
}


function oneToOnePermissionsModel(user, right/*, uri*/) {
  // For now, only authenticated users can be in onetoones
  if(!user) return Q.resolve(false);

  if(right === 'create' || right === 'join') {
    return Q.resolve(true);
  }

  if(right === 'admin') {
    return Q.resolve(false);
  }

  return Q.reject('Unknown right ' + right);
}

function permissionsModel(user, right, uri, roomType) {
  function log(x) {
    winston.verbose('Permission', { user: user && user.username, uri: uri, roomType: roomType, granted: x });
    return x;
  }

  assert(user, 'user required');
  assert(right, 'right required');
  assert(right === 'create' || right === 'join' || right === 'admin', 'Invalid right ' + right);
  assert(uri, 'uri required');
  assert(roomType, 'roomType required');

  switch(roomType) {
    case 'REPO':
      return repoPermissionsModel(user, right, uri).then(log);

    case 'ORG':
      return orgPermissionsModel(user, right, uri).then(log);

    case 'ONETOONE':
      // TODO: a one-to-one permissioning model
      return oneToOnePermissionsModel(user, right, uri).then(log);

    case 'ORG_CHANNEL':
      return orgChannelPermissionsModel(user, right, uri).then(log);

    case 'REPO_CHANNEL':
      return repoChannelPermissionsModel(user, right, uri).then(log);

    default:
      assert(false, 'Invalid roomType ' + roomType);
      throw 500;
  }

}

module.exports = permissionsModel;
