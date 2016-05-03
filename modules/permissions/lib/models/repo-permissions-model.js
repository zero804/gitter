/* eslint complexity: ["error", 18] */
"use strict";

var env               = require('gitter-web-env');
var winston           = env.logger;
var GitHubRepoService = require('gitter-web-github').GitHubRepoService;
var Promise           = require('bluebird');
var appEvents         = require('gitter-web-appevents');
var userIsInRoom      = require('../user-in-room');

function githubFailurePermissionsModel(user, right, uri, security) {
  if(right === 'admin') {
    winston.warn('Disable admin permissions while offline');
    return Promise.resolve(false);
  }

  // We can't help out. Send the original error out
  if(right !== 'view' && right !== 'join') return Promise.reject(new Error("Permission " + right + " not available offline"));

  // Public room? Let them in
  if(security === 'PUBLIC') return Promise.resolve(true);

  // Private room? Let the user in if they're already in the room.
  if(security === 'PRIVATE') return userIsInRoom(uri, user);

  return Promise.reject(new Error("Unable to process permissions offline"));
}

function checkAndNotifyPrivicyMismatch(isPrivateRepo, roomPrivicy, uri) {
  if(isPrivateRepo && roomPrivicy !== 'PRIVATE') {
    winston.warn('Repo now private, updating our permissions');
    appEvents.repoPermissionsChangeDetected(uri, true);
  } else if(!isPrivateRepo && roomPrivicy !== 'PUBLIC') {
    winston.warn('Repo now public, updating our permissions');
    appEvents.repoPermissionsChangeDetected(uri, false);
  }
}

/**
 * REPO permissions model
 */
module.exports = function repoPermissionsModel(user, right, uri, security) {
  // Security can be null for old repos
  if(security && (security !== 'PRIVATE' && security !== 'PUBLIC')) {
    return Promise.reject(new Error('Unknown repo security: ' + security));
  }

  // Anyone can view a public repo
  if(right === 'view' && security === 'PUBLIC') {
    return Promise.resolve(true);
  }

  // The only thing an unloggedin user can do is view a public repo
  if(!user) return Promise.resolve(false);

  var repoService = new GitHubRepoService(user);
  return repoService.getRepo(uri)
    .then(function(repoInfo) {

      // privicy wont change if the room hasnt been created yet
      if(right !== 'create') {
        // cant find the repo? its probably private
        var isPrivateRepo = repoInfo ? repoInfo.private : true;
        checkAndNotifyPrivicyMismatch(isPrivateRepo, security, uri);
      }

      /* Can't see the repo? no access */
      if(!repoInfo) return false;

      var perms = repoInfo.permissions;
      var isAdmin = perms && (perms.push || perms.admin);

      switch(right) {
        case 'view':
        case 'join':
          if(!repoInfo.private) return true;
          return true;

        case 'adduser':
          return true;

        case 'create':
          if(!isAdmin) return false;
          if(!repoInfo.private) return true;

          var ownerType = repoInfo.owner && repoInfo.owner.type;
          /* Private rooms. What to do... */
          switch(ownerType) {
            case 'Organization': // American spelling because GitHub
              return true;

            case 'User':
              return true;

            default:
              winston.error("Unknown owner type " + ownerType, { repo: repoInfo, user: user });
              return false;
          }
          /* break; */

        case 'admin':
          return !!isAdmin;

        default:
          throw 'Unknown right ' + right;
      }

    })
    .catch(function(err) {
      if(err.errno && err.syscall || err.statusCode >= 500) {
        winston.error('An error occurred processing repo-permissions: ' + err, { exception: err });
        // GitHub call failed and may be down.
        // We can fall back to whether the user is already in the room
        return githubFailurePermissionsModel(user, right, uri, security)
          .catch(function(nextError) {
            winston.warn('Unable to process offline permissions: ' + nextError, { exception: nextError });

            throw err; // Throw the original error
          });
      }

      throw err;
    });

};
