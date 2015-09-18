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

/**
 * Returns one of three options: null (for no access), 'view', 'member'
 */
function userCanAccessRoom(userId, troupeId) {
  if(!mongoUtils.isLikeObjectId(troupeId)) return Q.resolve(null);
  
  userId = mongoUtils.asObjectID(userId);
  troupeId = mongoUtils.asObjectID(troupeId);

  var query = {
    _id: 1,
    security: 1,
    githubType: 1
  };

  if (userId) {
    query.bans = { $elemMatch: { userId: userId } };
  }

  return persistence.Troupe.findById(troupeId, query, { lean: true })
    .exec()
    .then(function(troupe) {
      if (!troupe) return null;

      // Is the user banned from the room?
      if (troupe.bans && troupe.bans.length) return null;

      // No user? Only allow access to public rooms
      if(!userId) {
        return troupe.security === 'PUBLIC' ? 'view' : null;
      }

      return roomMembershipService.checkRoomMembership(troupeId, userId)
        .then(function(isInRoom) {

          if(troupe.security === 'PUBLIC') {
            return isInRoom ? 'member' : 'view';
          }

          if(!isInRoom) {
            logger.info("Denied user " + userId + " access to troupe " + troupe.uri);
            return null;
          }

          var isChannel = troupe.githubType === 'ORG_CHANNEL' ||
            troupe.githubType === 'REPO_CHANNEL' ||
            troupe.githubType === 'USER_CHANNEL';

          // No need to consult GitHub for private channels.
          if (isChannel && troupe.security === 'PRIVATE') {
            return 'member';
          }

          // Skip full-access check for one-to-one rooms
          if (troupe.githubType === 'ONETOONE') {
            return 'member';
          }

          return doFullAccessCheck(troupeId, userId)
            .then(function(fullAccessCheckResult) {
              if (!fullAccessCheckResult) {
                // This person no longer actually has access. Remove them!
                return roomMembershipService.removeRoomMember(troupeId, userId)
                  .then(function() {
                    return null;
                  });
              }

              return 'member';
            });

        });

    });
}

module.exports = userCanAccessRoom;
