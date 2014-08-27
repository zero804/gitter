/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var Q                     = require('q');
var userIsInRoom          = require('../user-in-room');
var premiumOrThrow        = require('./premium-or-throw');
var ownerIsEarlyAdopter   = require('../owner-is-early-adopter');

var ALLOWED_USER_CHANNEL_SECURITY_VALUES = {
  PRIVATE: 1,
  PUBLIC: 1
};

/**
 * USER_CHANNEL permissions model
 */
module.exports = function userChannelPermissionsModel(user, right, uri, security) {
  if(!ALLOWED_USER_CHANNEL_SECURITY_VALUES.hasOwnProperty(security)) {
    return Q.reject(new Error('Invalid security type:' + security));
  }

  // Anyone can view a public repo channel
  if(right === 'view' && security === 'PUBLIC') {
    return Q.resolve(true);
  }

  // No unauthenticated past this point
  if(!user) return Q.resolve(false);

  var userUri = uri.split('/').slice(0, -1).join('/');


  switch(right) {
    case 'join':

    case 'view':
      switch(security) {
        case 'PUBLIC': return Q.resolve(true);
        case 'PRIVATE':
          return userIsInRoom(uri, user).then(function(inRoom) {
            if (!inRoom) return Q.resolve(false);

            return ownerIsEarlyAdopter(uri).then(function(isEarlyAdopter) {
              if (isEarlyAdopter) return Q.resolve(true);
              return premiumOrThrow(userUri);
            });
          })

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
      if(userUri !== user.username) {
        return Q.resolve(false);
      }

      switch(security) {
        case 'PUBLIC':
          return Q.resolve(true);

        case 'PRIVATE':
          return premiumOrThrow(userUri);

        default:
          throw new Error('Illegal state');
      }
      break;

    case 'admin':
      return Q.resolve(userUri === user.username);

    default:
      throw 'Unknown right ' + right;
  }

};

