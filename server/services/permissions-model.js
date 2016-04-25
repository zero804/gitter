"use strict";

var env                  = require('gitter-web-env');
var winston              = env.logger;
var Promise              = require('bluebird');
var userIsBannedFromRoom = require('gitter-web-permissions/lib/user-banned-from-room');

var repoPermissionsModel        = require('./permissions/repo-permissions-model');
var orgPermissionsModel         = require('./permissions/org-permissions-model');
var oneToOnePermissionsModel    = require('./permissions/one-to-one-permissions-model');
var orgChannelPermissionsModel  = require('./permissions/org-channel-permissions-model');
var repoChannelPermissionsModel = require('./permissions/repo-channel-permissions-model');
var userChannelPermissionsModel = require('./permissions/user-channel-permissions-model');
var debug                       = require('debug')('gitter:permissions-model');

var userService                 = require('./user-service');

function checkBan(user, uri) {
  if(!user) return Promise.resolve(false);
  if(!uri) return Promise.resolve(false);

  return userIsBannedFromRoom(uri, user);
}

var ALL_RIGHTS = {
  create: 1,
  join: 1,
  admin: 1,
  adduser: 1,
  view: 1
};

/**
 * Main entry point
 */
function permissionsModel(user, right, uri, roomType, security) {
  function log(x) {
    debug("Permission: user=%s, uri=%s, roomType=%s, granted=%s, right=%s",  user && user.username, uri, roomType, x, right);
    return x;
  }

  if(!right) return Promise.reject(new Error('right required'));

  if(!ALL_RIGHTS.hasOwnProperty(right)) {
    return Promise.reject(new Error('Invalid right:' + right));
  }

  if(!roomType) return Promise.reject(new Error('roomType required'));

  var submodel = {
    'REPO': repoPermissionsModel,
    'ORG': orgPermissionsModel,
    'ONETOONE': oneToOnePermissionsModel,
    'ORG_CHANNEL': orgChannelPermissionsModel,
    'REPO_CHANNEL': repoChannelPermissionsModel,
    'USER_CHANNEL': userChannelPermissionsModel
  }[roomType];

  if(!submodel) {
    return Promise.reject(new Error('Invalid roomType ' + roomType));
  }

  if(roomType !== 'ONETOONE' && !uri) {
    // For now uri can be null for one to one
    // This will need to be fixed before we handle
    // more fine grained permissions
    return Promise.reject(new Error('uri required'));
  }

  return checkBan(user, uri)
    .then(function(banned) {
      if(banned) return false;

      return submodel(user, right, uri, security)
        .then(log)
        .catch(function(err) {
          if(err && err.gitterAction === 'logout_destroy_user_tokens') {
            winston.warn('User tokens have been revoked. Destroying tokens');

            return userService.destroyTokensForUserId(user._id)
              .thenThrow(err);
          }

          throw err;
        });

    });
}

module.exports = permissionsModel;
