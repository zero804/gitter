/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var GitHubRepoService    = require('../github/github-repo-service');
var winston              = require('../../utils/winston');
var Q                    = require('q');
var premiumOrThrow       = require('./premium-or-throw');
var appEvents            = require('../../app-events');
var userIsInRoom         = require('../user-in-room');
var ownerIsEarlyAdopter  = require('../owner-is-early-adopter');


function githubFailurePermissionsModel(user, right, uri, security) {
  if(right === 'admin') {
    winston.warn('Disable admin permissions while offline');
    return Q.resolve(false);
  }

  // We can't help out. Send the original error out
  if(right !== 'view' && right !== 'join') return Q.reject(new Error("Permission " + right + " not available offline"));

  // Public room? Let them in
  if(security === 'PUBLIC') return Q.resolve(true);

  // Private room? Let the user in if they're already in the room.
  if(security === 'PRIVATE') return userIsInRoom(uri, user);

  //if(security === 'PRIVATE') return userIsInRoom(uri, user).then(function(inRoom) {
  //  if (!inRoom) return Q.resolve(false);
  //  return ownerIsEarlyAdopter(uri).then(function(isEarlyAdopter) {
  //    if (isEarlyAdopter) return Q.resolve(true);
  //    var owner = uri.split('/')[0];
  //    return premiumOrThrow(owner);
  //  });
  //});

  return Q.reject(new Error("Unable to process permissions offline"));
}

/**
 * REPO permissions model
 */
module.exports = function repoPermissionsModel(user, right, uri, security, options) {
  options = options || {};
  // Security can be null for old repos
  if(security && (security !== 'PRIVATE' && security !== 'PUBLIC')) {
    return Q.reject(new Error('Unknown repo security: ' + security));
  }

  // Anyone can view a public repo
  if(right === 'view' && security === 'PUBLIC') {
    return Q.resolve(true);
  }

  // The only thing an unloggedin user can do is view a public repo
  if(!user) return Q.resolve(false);

  var repoService = new GitHubRepoService(options.githubTokenUser || user);
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

      var perms = repoInfo.permissions;
      var isAdmin = perms && (perms.push || perms.admin);
      

      switch(right) {
        case 'view':
        case 'join':
          if(!repoInfo.private) return true;

          return ownerIsEarlyAdopter(uri).then(function(isEarlyAdopter) {
            if (isEarlyAdopter) return Q.resolve(true);
            return premiumOrThrow(repoInfo.owner.login);
          });

          break;

        case 'adduser':
          return true;

        case 'create':
          if(!isAdmin) return false;
          if(!repoInfo.private) return true;

          var ownerType = repoInfo.owner && repoInfo.owner.type;
          /* Private rooms. What to do... */
          switch(ownerType) {
            case 'Organization': // American spelling because GitHub
              return premiumOrThrow(repoInfo.owner.login);

            case 'User':
              return premiumOrThrow(repoInfo.owner.login);

            default:
              winston.error("Unknown owner type " + ownerType, { repo: repoInfo, user: user });
              return false;
          }
          break;

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
          .fail(function(nextError) {
            winston.warn('Unable to process offline permissions: ' + nextError, { exception: nextError });

            throw err; // Throw the original error
          });
      }

      throw err;
    });

};

