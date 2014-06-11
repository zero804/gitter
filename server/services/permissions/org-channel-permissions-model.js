/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var Q                    = require('q');
var userIsInRoom         = require('../user-in-room');
var uriIsPremium         = require('../uri-is-premium');

var orgPermissionsModel  = require('./org-permissions-model');

var ALLOWED_ORG_CHANNEL_SECURITY = {
  PRIVATE: 1,
  PUBLIC: 1,
  INHERITED: 1
};

/**
 * ORG_CHANNEL permissions model
 */
module.exports = function orgChannelPermissionsModel(user, right, uri, security) {
  if(!ALLOWED_ORG_CHANNEL_SECURITY.hasOwnProperty(security)) {
    return Q.reject(new Error('Invalid security type:' + security));
  }

  // Anyone can view a public org channel
  if(right === 'view' && security === 'PUBLIC') {
    return Q.resolve(true);
  }

  // No unauthenticated past this point
  if(!user) return Q.resolve(false);

  var orgUri = uri.split('/').slice(0, -1).join('/');

  switch(right) {
    case 'join':
    case 'view':
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
      /* Anyone who can create an ORG can create a PUBLIC child channel */
      var userPermissionPromise = orgPermissionsModel(user, 'create', orgUri);

      switch(security) {
        case 'PUBLIC':
          return userPermissionPromise;

        case 'PRIVATE':
        case 'INHERITED':
          return userPermissionPromise
            .then(function(access) {
              if(!access) return false;

              return uriIsPremium(orgUri)
                .then(function(isPremium) {
                  return isPremium;
                });
            });
        default:
          throw new Error('Illegal state');
      }
      break;

    case 'admin':
      /* Anyone who can join an ORG can create a child channel */
      return orgPermissionsModel(user, 'admin', orgUri);

    default:
      throw 'Unknown right ' + right;
  }
};
