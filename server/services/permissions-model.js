/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var GitHubRepoService  = require('./github/github-repo-service');
var GitHubOrgService   = require('./github/github-org-service');
var assert             = require("assert");
var winston            = require('../utils/winston');
var Q                  = require('q');
var userIsInRoom       = require('./user-in-room');
var appEvents          = require('../app-events');

/**
 * REPO permissions model
 */
function repoPermissionsModel(user, right, uri, security) {
  // Security can be null for old repos
  if(security && (security !== 'PRIVATE' && security !== 'PUBLIC')) {
    assert('Unknown repo security: ' + security);
  }

  // For now, only authenticated users can be members of orgs
  if(!user) return false;

  var repoService = new GitHubRepoService(user);
  return repoService.getRepo(uri)
    .then(function(repoInfo) {
      /* Can't see the repo? no access */
      if(!repoInfo) {
        if(security !== 'PRIVATE') {
          if(right !== 'create') {
            winston.warn('Unable to access repo, but not set as private. Notifying');
            appEvents.repoPermissionsChangeDetected(uri, true);
          }
        }
        return false;
      }

      if(right !== 'create') {
        if(repoInfo.private && security !== 'PRIVATE') {
          winston.warn('Repo private, updating our permissions');
          appEvents.repoPermissionsChangeDetected(uri, true);
        } else if(!repoInfo.private && security !== 'PUBLIC') {
          winston.warn('Repo public, updating our permissions');
          appEvents.repoPermissionsChangeDetected(uri, false);
        }
      }

      /* Want to join and can see the repo? Go ahead! */
      if(right === 'join') return true;

      var perms = repoInfo.permissions;
      var isAdmin = perms && (perms.push || perms.admin);

      switch(right) {
        case 'join':
        case 'adduser':
          return true;

        case 'create':
        case 'admin':
          return !!isAdmin;

        default:
          throw 'Unknown right ' + right;
      }

    });

}

/**
 * ORG permissions model
 */
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

      switch(right) {
        case 'create':
        case 'admin':
        case 'join':
        case 'adduser':
          /* Org members can do anything */
          return true;

        default:
          throw 'Unknown right ' + right;
      }

    });
}

/**
 * ONE-TO-ONE permissions model
 */
function oneToOnePermissionsModel(user, right, uri, security) {
  // Security is only for child rooms
  assert(!security);

  // For now, only authenticated users can be in onetoones
  if(!user) return Q.resolve(false);

  switch(right) {
    case 'create':
    case 'join':
      return Q.resolve(true);

    case 'adduser':
    case 'admin':
      return Q.resolve(false);

    default:
      throw 'Unknown right ' + right;
  }

}

/**
 * ORG_CHANNEL permissions model
 */
function orgChannelPermissionsModel(user, right, uri, security) {
  assert({ 'PRIVATE': 1, 'PUBLIC': 1, 'INHERITED': 1}.hasOwnProperty(security), 'Invalid security type:' + security);
  var orgUri = uri.split('/').slice(0, -1).join('/');

  switch(right) {
    case 'join':
      switch(security) {
        case 'PUBLIC': return Q.resolve(true);
        case 'PRIVATE': return userIsInRoom(uri, user);
        case 'INHERITED':
          return orgPermissionsModel(user, right, orgUri);
        default:
          throw 'Unknown security: ' + security;
      }
      break;

    case 'adduser':
      switch(security) {
        case 'PUBLIC':
          return Q.resolve(true);

        case 'PRIVATE':
          return Q.all([
                    userIsInRoom(uri, user),
                    orgPermissionsModel(user, right, orgUri)
                  ])
                  .spread(function(inRoom, orgPerm) {
                    return inRoom && orgPerm;
                  });

        case 'INHERITED':
          return orgPermissionsModel(user, right, orgUri);
        default:
          throw 'Unknown security: ' + security;
      }
      break;

    case 'create':
      /* Anyone who can join an ORG can create a child channel */
      return orgPermissionsModel(user, 'join', orgUri);

    case 'admin':
      /* Anyone who can join an ORG can create a child channel */
      return orgPermissionsModel(user, 'admin', orgUri);

    default:
      throw 'Unknown right ' + right;
  }
}

/**
 * REPO_CHANNEL permissions model
 */
function repoChannelPermissionsModel(user, right, uri, security) {
  assert({ 'PRIVATE': 1, 'PUBLIC': 1, 'INHERITED': 1}.hasOwnProperty(security), 'Invalid security type:' + security);

  var repoUri = uri.split('/').slice(0, -1).join('/');

  switch(right) {
    case 'join':
      switch(security) {
        case 'PUBLIC': return Q.resolve(true);
        case 'PRIVATE':
          return userIsInRoom(uri, user);

        case 'INHERITED':
          return repoPermissionsModel(user, right, repoUri);
        default:
          throw 'Unknown security: ' + security;
      }
      break;

    case 'adduser':
      switch(security) {
        case 'PUBLIC':
          return Q.resolve(true);

        case 'PRIVATE':
          return Q.all([
                    userIsInRoom(uri, user),
                    repoPermissionsModel(user, right, repoUri)
                  ])
                  .spread(function(inRoom, orgPerm) {
                    return inRoom && orgPerm;
                  });

        case 'INHERITED':
          return repoPermissionsModel(user, right, repoUri);
        default:
          throw 'Unknown security: ' + security;
      }
      break;

    case 'create':
      /* Anyone who can ADMIN an REPO can create a child channel */
      return repoPermissionsModel(user, 'create', repoUri);

    case 'admin':
      /* Anyone who can join an ORG can create a child channel */
      return repoPermissionsModel(user, 'admin', repoUri);

    default:
      throw 'Unknown right ' + right;
  }

}

/**
 * USER_CHANNEL permissions model
 */
function userChannelPermissionsModel(user, right, uri, security) {
  assert({ 'PRIVATE': 1, 'PUBLIC': 1 }.hasOwnProperty(security), 'Invalid security type:' + security);

  var userUri = uri.split('/').slice(0, -1).join('/');

  switch(right) {
    case 'join':
      switch(security) {
        case 'PUBLIC': return Q.resolve(true);
        case 'PRIVATE':
          return userIsInRoom(uri, user);
        /* No inherited security for user channels */
        default:
          throw 'Unknown security: ' + security;
      }
      break;

    case 'adduser':
      if(security === 'PUBLIC') return Q.resolve(true);

      if(userUri === user.username) {
        return Q.resolve(true);
      }

      return userIsInRoom(uri, user);

    case 'create':
    case 'admin':
      return Q.resolve(userUri === user.username);

    default:
      throw 'Unknown right ' + right;
  }

}

/**
 * Main entry point
 */
function permissionsModel(user, right, uri, roomType, security) {
  function log(x) {
    winston.verbose('Permission', { user: user && user.username, uri: uri, roomType: roomType, granted: x, right: right });
    return x;
  }

  assert(user, 'user required');
  assert(right, 'right required');
  assert(right === 'create' || right === 'join' || right === 'admin' || right === 'adduser', 'Invalid right ' + right);
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

  if(roomType !== 'ONETOONE') {
    // For now uri can be null for one to one
    // This will need to be fixed before we handle
    // more fine grained permissions
    assert(uri, 'uri required');
  }


  return submodel(user, right, uri, security)
    .then(log)
    .fail(function(err) {
      if(err.gitterAction === 'logout_destroy_user_tokens') {
        winston.warn('User tokens have been revoked. Destroying tokens');
        user.destroyTokens();
        return user.saveQ().thenResolve(false);
      }

      throw err;
    });
}

module.exports = permissionsModel;
