/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var winston              = require('../utils/winston');
var Q                    = require('q');
var userIsBannedFromRoom = require('./user-banned-from-room');

var repoPermissionsModel        = require('./permissions/repo-permissions-model');
var orgPermissionsModel         = require('./permissions/org-permissions-model');
var oneToOnePermissionsModel    = require('./permissions/one-to-one-permissions-model');
var orgChannelPermissionsModel  = require('./permissions/org-channel-permissions-model');
var repoChannelPermissionsModel = require('./permissions/repo-channel-permissions-model');
var userChannelPermissionsModel = require('./permissions/user-channel-permissions-model');

function checkBan(user, uri) {
  if(!user) return Q.resolve(false);
  if(!uri) return Q.resolve(false);

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
function permissionsModel(user, right, uri, roomType, security, options) {
  function log(x) {
    winston.verbose('Permission', { user: user && user.username, uri: uri, roomType: roomType, granted: x, right: right });
    return x;
  }

  var options = options || {};

  if(!right) return Q.reject(new Error('right required'));

  if(!ALL_RIGHTS.hasOwnProperty(right)) {
    return Q.reject(new Error('Invalid right:' + right));
  }

  if(!roomType) return Q.reject(new Error('roomType required'));

  var submodel = {
    'REPO': repoPermissionsModel,
    'ORG': orgPermissionsModel,
    'ONETOONE': oneToOnePermissionsModel,
    'ORG_CHANNEL': orgChannelPermissionsModel,
    'REPO_CHANNEL': repoChannelPermissionsModel,
    'USER_CHANNEL': userChannelPermissionsModel
  }[roomType];

  if(!submodel) {
    return Q.reject(new Error('Invalid roomType ' + roomType));
  }

  if(roomType !== 'ONETOONE' && !uri) {
    // For now uri can be null for one to one
    // This will need to be fixed before we handle
    // more fine grained permissions
    return Q.reject(new Error('uri required'));
  }

  return checkBan(user, uri)
    .then(function(banned) {
      if(banned) return false;

      return submodel(user, right, uri, security, options)
        .then(log)
        .fail(function(err) {
          if(err.gitterAction === 'logout_destroy_user_tokens') {
            winston.warn('User tokens have been revoked. Destroying tokens');

            var tokenUser = options.githubTokenUser || user;
            tokenUser.destroyTokens();
            return tokenUser.saveQ()
              .thenReject(err);
          }

          throw err;
        });

    });
}

module.exports = permissionsModel;
