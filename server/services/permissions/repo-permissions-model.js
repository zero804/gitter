/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var GitHubRepoService    = require('../github/github-repo-service');
var winston              = require('../../utils/winston');
var Q                    = require('q');
var uriIsPremium         = require('../uri-is-premium');
var appEvents            = require('../../app-events');

/**
 * REPO permissions model
 */
module.exports = function repoPermissionsModel(user, right, uri, security) {
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

      var perms = repoInfo.permissions;
      var isAdmin = perms && (perms.push || perms.admin);

      switch(right) {
        case 'view':
        case 'join':
        case 'adduser':
          return true;

        case 'create':
          if(!isAdmin) return false;
          if(!repoInfo.private) return true;

          /* Private rooms. What to do... */
          switch(repoInfo.owner.type) {
            case 'Organization': // American spelling because GitHub
              return uriIsPremium(repoInfo.owner.login);
            case 'User':
              return uriIsPremium(repoInfo.owner.login);
            default:
              winston.error("Unknown owner type " + repoInfo.owner.type, { repo: repoInfo, user: user });
              return false;
          }
          break;

        case 'admin':
          return !!isAdmin;

        default:
          throw 'Unknown right ' + right;
      }

    });

};

