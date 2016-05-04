/* eslint complexity: ["error", 16] */
"use strict";

var Promise      = require('bluebird');
var userIsInRoom = require('../user-in-room');

var ALLOWED_USER_CHANNEL_SECURITY_VALUES = {
  PRIVATE: 1,
  PUBLIC: 1
};

/**
 * USER_CHANNEL permissions model
 */
module.exports = Promise.method(function userChannelPermissionsModel(user, right, uri, security) {
  if(!ALLOWED_USER_CHANNEL_SECURITY_VALUES.hasOwnProperty(security)) {
    throw new Error('Invalid security type:' + security);
  }

  // Anyone can view a public repo channel
  if(right === 'view' && security === 'PUBLIC') {
    return true;
  }

  // No unauthenticated past this point
  if(!user) return false;

  var userUri = uri.split('/').slice(0, -1).join('/');

  switch(right) {
    case 'join':
    case 'view':
      switch(security) {
        case 'PUBLIC': return true;
        case 'PRIVATE':
          return userIsInRoom(uri, user).then(function(inRoom) {
            if (!inRoom) return false;

            return true;
          });

        /* No inherited security for user channels */
        default:
          throw 'Unknown security: ' + security;
      }
      /* break; */

    case 'adduser':
      if(security === 'PUBLIC') return true;

      if(userUri === user.username) {
        return true;
      }

      return userIsInRoom(uri, user);

    case 'create':
      if(userUri !== user.username) {
        return false;
      }

      switch(security) {
        case 'PUBLIC':
          return true;

        case 'PRIVATE':
          return true;

        default:
          throw new Error('Illegal state');
      }
      /* break; */

    case 'admin':
      return userUri === user.username;

    default:
      throw 'Unknown right ' + right;
  }

});
