"use strict";

var env                   = require('gitter-web-env');
var logger                = env.logger;
var redisClient           = env.redis.getClient();
var errorReporter         = env.errorReporter;

var persistence           = require('./persistence-service');
var dolph                 = require('dolph');
var Q                     = require('q');
var userService           = require('./user-service');
var troupeService         = require('./troupe-service');
var roomPermissionsModel  = require('./room-permissions-model');
var roomMembershipService = require('./room-membership-service');
var debug                 = require('debug')('gitter:user-can-access-room');
var mongoUtils            = require('../utils/mongo-utils');

var rateLimiter = dolph.rateLimiter({
  prefix: 'ac:',
  redisClient: redisClient
});

var RATE = 600; // Every 10 minutes do a full access check against GitHub

function doFullAccessCheck(troupeId, userId) {
  var d = Q.defer();
  rateLimiter(userId + ':' + troupeId, RATE, function(err, count/*, ttl*/) {
    if (err) return d.reject(err);
    d.resolve(count === 1);
  });

  return d.promise
    .then(function(checkRequired) {
      if (!checkRequired) return true; // No check required

      debug('Full access check required.');
      return Q.all([
          userService.findById(userId),
          troupeService.findById(troupeId)
        ])
        .spread(function(user, troupe) {
          if (!user || !troupe) return false;
          return roomPermissionsModel(user, 'join', troupe);
        });
    })
    .catch(function(err) {
      errorReporter(err, { troupeId: troupeId, userId: userId }, { module: 'user-can-access-room' });
      // Something is broken, let the user (who is already in the room) through for now
      return true;
    });
}

function userCanAccessRoom(userId, troupeId, callback) {
  userId = mongoUtils.asObjectID(userId);
  troupeId = mongoUtils.asObjectID(troupeId);

  // TODO: use the room permissions model
  return persistence.Troupe.findById(troupeId, {
      _id: 1,
      'bans': { $elemMatch: { userId: userId } },
      security: 1,
      githubType: 1,
      uri: 1
    }, {
      lean: true
    })
    .exec()
    .then(function(troupe) {
      if (!troupe) return false;
      // Is the user banned from the room?
      if (troupe.bans && troupe.bans.length) return false;

      if(troupe.security === 'PUBLIC') {
        return true;
      }

      // After this point, everything needs to be authenticated
      if(!userId) {
        return false;
      }


      return roomMembershipService.checkRoomMembership(troupeId, userId)
        .then(function(isInRoom) {
          if(!isInRoom) {
            // TODO: This might be too slow for prod?
            return persistence.User.findById(userId)
            .then(function(user) {
              return roomPermissionsModel(user, 'view', troupe);
            });
          }

          var isChannel = troupe.githubType === 'ORG_CHANNEL' ||
            troupe.githubType === 'REPO_CHANNEL' ||
            troupe.githubType === 'USER_CHANNEL';

          // No need to consult GitHub for private channels.
          if (isChannel && troupe.security === 'PRIVATE') {
            return true;
          }

          // Skip full-access check for one-to-one rooms
          if (troupe.githubType === 'ONETOONE') {
            return true;
          }

          return doFullAccessCheck(troupeId, userId)
            .then(function(fullAccessCheckResult) {
              if (!fullAccessCheckResult) {
                // This person no longer actually has access. Remove them!
                return roomMembershipService.removeRoomMember(troupeId, userId)
                  .then(function() {
                    return false;
                  });
              }

              return true;
            });

        });

    })
    .nodeify(callback);
}

module.exports = userCanAccessRoom;
