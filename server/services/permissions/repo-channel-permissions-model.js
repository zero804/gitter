/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var Q                    = require('q');
var userIsInRoom         = require('../user-in-room');
var premiumOrThrow       = require('./premium-or-throw');

var repoPermissionsModel = require('./repo-permissions-model');

var ALLOWED_SECURITY_VALUES = {
  PRIVATE: 1,
  PUBLIC: 1,
  INHERITED: 1
};

/**
 * REPO_CHANNEL permissions model
 */
module.exports = function repoChannelPermissionsModel(user, right, uri, security) {
  if(!ALLOWED_SECURITY_VALUES.hasOwnProperty(security)) {
    return Q.reject(new Error('Invalid security type:' + security));
  }

  // Anyone can view a public repo channel
  if(right === 'view' && security === 'PUBLIC') {
    return Q.resolve(true);
  }

  // No unauthenticated past this point
  if(!user) return Q.resolve(false);

  var repoParts = uri.split('/');
  var repoUri = repoParts.slice(0, -1).join('/');
  var repoOwnerUri = repoParts[0];

  switch(right) {
    case 'join':
    case 'view':
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
      /* Anyone who can CREATE an REPO can create a child channel */
      var repoPermissionPromise = repoPermissionsModel(user, 'create', repoUri);

      switch(security) {
        case 'PUBLIC':
          return repoPermissionPromise;

        case 'PRIVATE':
        case 'INHERITED':
          return repoPermissionPromise
            .then(function(access) {
              if(!access) return false;

              return premiumOrThrow(repoOwnerUri);
            });
        default:
          throw new Error('Illegal state');
      }
      break;

    case 'admin':
      /* Anyone who can join an ORG can create a child channel */
      return repoPermissionsModel(user, 'admin', repoUri);

    default:
      throw 'Unknown right ' + right;
  }

};