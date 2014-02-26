/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var GitHubRepoService  = require('./github/github-repo-service');
var GitHubOrgService   = require('./github/github-org-service');
var assert             = require("assert");
var winston            = require('winston');
var Q                  = require('q');
var persistence        = require('./persistence-service');

function userIsAlreadyInRoom(uri, user) {
  var lcUri = uri.toLowerCase();
  return persistence.Troupe.findOneQ({ lcUri: lcUri }, 'users.userId', { lean: true })
    .then(function(troupe) {
      if(!troupe) return;

      return troupe.users.some(function(troupeUser) {
        return troupeUser.userId === user._id;
      });

    });
}

function repoPermissionsModel(user, right, uri, security) {
  // Security is only for child rooms
  assert(!security);

  // For now, only authenticated users can be members of orgs
  if(!user) return false;

  var repoService = new GitHubRepoService(user);
  return repoService.getRepo(uri)
    .then(function(repoInfo) {
      /* Can't see the repo? no access */
      if(!repoInfo) return false;

      if(right === 'join') return true;

      var perms = repoInfo.permissions;

      /* Need admin or push permission from here on out */
      if(!perms) return false;

      if(!perms.push && !perms.admin) return false;

      if(right === 'create') {
        // If the user isn't wearing the magic hat, refuse them
        // permission
        if(!user.permissions.createRoom) return false;

        return true;
      }

      if(right === 'admin') {
        return perms.admin || perms.push;
      }

      assert(false, 'Unknown right ' + right);
    });

}

function orgPermissionsModel(user, right, uri, security) {
  // Security is only for child rooms
  assert(!security);

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


function oneToOnePermissionsModel(user, right, uri, security) {
  // Security is only for child rooms
  assert(!security);

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

function orgChannelPermissionsModel(user, right, uri, security) {
  assert({ 'PRIVATE': 1, 'OPEN': 1, 'INHERITED': 1}.hasOwnProperty(security), 'Invalid security type:' + security);

  if(right === 'join') {
    switch(security) {
      case 'OPEN': return Q.resolve(true);
      case 'PRIVATE': return userIsAlreadyInRoom(uri, user);
      // INHERITED falls through
    }
  }

  /* To create this room, you need admin rights on the parent room */
  if(right === 'create') {
    right = 'admin';
  }

  var orgUri = uri.split('/').slice(0, -1).join('/');
  winston.verbose('Proxying permission on ' + uri + ' to org permission on ' + orgUri, { user: user && user.username, right: right });
  return orgPermissionsModel(user, right, orgUri);
}

function repoChannelPermissionsModel(user, right, uri, security) {
  assert({ 'PRIVATE': 1, 'OPEN': 1, 'INHERITED': 1}.hasOwnProperty(security), 'Invalid security type:' + security);

  if(right === 'join') {
    switch(security) {
      case 'OPEN': return Q.resolve(true);
      case 'PRIVATE': return userIsAlreadyInRoom(uri, user);
      // INHERITED falls through
    }
  }

  /* To create this room, you need admin rights on the parent room */
  if(right === 'create') {
    right = 'admin';
  }

  var repoUri = uri.split('/').slice(0, -1).join('/');
  winston.verbose('Proxying permission on ' + uri + ' to repo permission on ' + repoUri, { user: user && user.username, right: right });
  return repoPermissionsModel(user, right, repoUri);
}

function userChannelPermissionsModel(user, right, uri, security) {
  assert({ 'PRIVATE': 1, 'OPEN': 1 }.hasOwnProperty(security), 'Invalid security type:' + security);

  if(right === 'join') {
    switch(security) {
      case 'OPEN': return Q.resolve(true);
      case 'PRIVATE': return userIsAlreadyInRoom(uri, user);
    }
  }

  var userUri = uri.split('/').slice(0, -1).join('/');

  /* To create this room, you need to be THE user */
  if(right === 'create') {
    return Q.resolve(userUri === user.username);
  }

  winston.verbose('Proxying permission on ' + uri + ' to user permission on ' + userUri, { user: user && user.username, right: right });
  return oneToOnePermissionsModel(user, right, userUri);
}

function permissionsModel(user, right, uri, roomType, security) {
  function log(x) {
    winston.verbose('Permission', { user: user && user.username, uri: uri, roomType: roomType, granted: x });
    return x;
  }

  assert(user, 'user required');
  assert(right, 'right required');
  assert(right === 'create' || right === 'join' || right === 'admin', 'Invalid right ' + right);
  assert(uri, 'uri required');
  assert(roomType, 'roomType required');

  var submodel = {
    'REPO': repoPermissionsModel,
    'ORG': orgPermissionsModel,
    'ONETOONE': oneToOnePermissionsModel,
    'ORG_CHANNEL': orgChannelPermissionsModel,
    'REPO_CHANNEL': repoChannelPermissionsModel,
    'USER_CHANNEL': userChannelPermissionsModel
  }[roomType];

  if(!submodel) {
    assert(false, 'Invalid roomType ' + roomType);
    throw 500;
  }

  return submodel(user, right, uri, security).then(log);
}

module.exports = permissionsModel;
