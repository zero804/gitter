"use strict";

var env                   = require('gitter-web-env');
var redisClient           = env.redis.getClient();
var errorReporter         = env.errorReporter;

var persistence           = require('./persistence-service');
var dolph                 = require('dolph');
var Q                     = require('q');
var userService           = require('./user-service');
var troupeService         = require('./troupe-service');
var roomPermissionsModel  = require('./room-permissions-model');
var roomMembershipService = require('./room-membership-service');
var mongoUtils            = require('../utils/mongo-utils');

var rateLimiter = dolph.rateLimiter({
  prefix: 'ac:',
  redisClient: redisClient
});

var RATE = 600; // Every 10 minutes do a full access check against GitHub

function relaxedPermCheck(userId, roomId, permission) {
  var d = Q.defer();
  rateLimiter(userId + ':' + roomId, RATE, function(err, count/*, ttl*/) {
    if (err) return d.reject(err);
    d.resolve(count === 1);
  });

  return d.promise
    .then(function(checkRequired) {
      // No check required this time, user can stay
      if (!checkRequired) return true;

      return permCheck(userId, roomId, permission);
    })
    .catch(function(err) {
      errorReporter(err, { roomId: roomId, userId: userId }, { module: 'user-can-access-room' });
      // Something is broken, let the user (who is already in the room) through for now
      return true;
    });
}

function permCheck(userId, roomId, permission) {
  return Q.all([
      userService.findById(userId),
      troupeService.findById(roomId)
    ])
    .spread(function(user, room) {
      if (!user || !room) return false;

      return roomPermissionsModel(user, permission, room);
    });
}

function isPrivateChannel(room) {
  return room.security === 'PRIVATE' &&
           (room.githubType === 'ORG_CHANNEL' ||
            room.githubType === 'REPO_CHANNEL' ||
            room.githubType === 'USER_CHANNEL');
}

function checkExpensivePerms(userId, roomId, permission, isInRoom) {
  if (isInRoom) {
    // we can be more relaxed in here as they have already passed
    // as permissions check in the past
    // We dont need to check github all the time
    return relaxedPermCheck(userId, roomId, permission)
      .then(function(passes) {
        if (passes) return true;

        // This person no longer actually has access. Remove them!
        return roomMembershipService.removeRoomMember(roomId, userId)
          .then(function() {
            return false;
          });
        });
  } else {
    // cant trust this user. we must be strict.
    return permCheck(userId, roomId, permission);
  }
}

function getLeanRoom(roomId, userId) {
  var query = {
    _id: 1,
    security: 1,
    githubType: 1
  };

  if (userId) {
    query.bans = { $elemMatch: { userId: userId } };
  }

  return persistence.Troupe.findById(roomId, query, { lean: true }).exec();
}

function checkIfBanned(leanRoom) {
  return leanRoom.bans && leanRoom.bans.length;
}

function permissionToRead(userId, roomId) {
  if(!mongoUtils.isLikeObjectId(roomId)) return Q.resolve(false);

  userId = mongoUtils.asObjectID(userId);
  roomId = mongoUtils.asObjectID(roomId);

  return getLeanRoom(roomId, userId)
    .then(function(leanRoom) {
      if (!leanRoom) return false;

      if (!userId) {
        return leanRoom.security === 'PUBLIC';
      }

      if (checkIfBanned(leanRoom)) return false;

      if (leanRoom.security === 'PUBLIC') return true;

      return roomMembershipService.checkRoomMembership(roomId, userId)
        .then(function(isInRoom) {

          if (leanRoom.githubType === 'ONETOONE' || isPrivateChannel(leanRoom)) {
            return isInRoom;
          }

          return checkExpensivePerms(userId, roomId, 'view', isInRoom);
        });
    });
}

function permissionToWrite(userId, roomId) {
  if(!mongoUtils.isLikeObjectId(roomId)) return Q.resolve(false);

  userId = mongoUtils.asObjectID(userId);
  roomId = mongoUtils.asObjectID(roomId);

  if (!userId) return Q.resolve(false);

  return getLeanRoom(roomId, userId)
    .then(function(leanRoom) {
      if (!leanRoom) return false;

      if (checkIfBanned(leanRoom)) return false;

      return roomMembershipService.checkRoomMembership(roomId, userId)
        .then(function(isInRoom) {

          if (leanRoom.githubType === 'ONETOONE' || isPrivateChannel(leanRoom)) {
            return isInRoom;
          }

          return checkExpensivePerms(userId, roomId, 'join', isInRoom);
        });
    });
}

module.exports = {
  permissionToRead: permissionToRead,
  permissionToWrite: permissionToWrite
};
