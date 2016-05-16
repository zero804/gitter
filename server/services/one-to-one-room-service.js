"use strict";

var env                       = require('gitter-web-env');
var stats                     = env.stats;
var userService               = require('./user-service');
var persistence               = require('gitter-web-persistence');
var userDefaultFlagsService   = require('./user-default-flags-service');
var Troupe                    = persistence.Troupe;
var assert                    = require("assert");
var mongoUtils                = require('gitter-web-persistence-utils/lib/mongo-utils');
var Promise                   = require('bluebird');
var ObjectID                  = require('mongodb').ObjectID;
var mongooseUtils             = require('gitter-web-persistence-utils/lib/mongoose-utils');
var StatusError               = require('statuserror');
var roomMembershipService     = require('./room-membership-service');
var securityDescriptorService = require('gitter-web-permissions/lib/security-descriptor-service');
var legacyMigration           = require('gitter-web-permissions/lib/legacy-migration');
var debug                     = require('debug')('gitter:one-to-one-room-service');

function getOneToOneRoomQuery(userId1, userId2) {
  // Need to use $elemMatch due to a regression in Mongo 2.6, see https://jira.mongodb.org/browse/SERVER-13843
  return {
    $and: [
      { oneToOne: true },
      { 'oneToOneUsers': { $elemMatch: { userId: userId1 } } },
      { 'oneToOneUsers': { $elemMatch: { userId: userId2 } } }
    ]
  };

}

function findExistingOneToOneRoom(userId1, userId2) {
  var query = getOneToOneRoomQuery(userId1, userId2);

  // First attempt is a simple find...
  return Troupe.findOne(query)
    .exec();
}

/**
 * Internal method.

 * Returns [troupe, existing]
 */
function upsertNewOneToOneRoom(userId1, userId2) {
  var query = getOneToOneRoomQuery(userId1, userId2);

  // Second attempt is an upsert
  var insertFields = {
    oneToOne: true,
    status: 'ACTIVE',
    githubType: 'ONETOONE',
    oneToOneUsers: [{
      _id: new ObjectID(),
      userId: userId1
    }, {
      _id: new ObjectID(),
      userId: userId2
    }],
    userCount: 0
  };

  debug('Attempting upsert for new one-to-one room');

  // Upsert returns [model, existing] already
  return mongooseUtils.upsert(Troupe, query, {
    $setOnInsert: insertFields
  })
  .tap(function(upsertResult) {
    var troupe = upsertResult[0];
    var updateExisting = upsertResult[1];

    if (updateExisting) return;

    var descriptor = legacyMigration.generatePermissionsForRoom(troupe, null, null);
    return securityDescriptorService.insertForRoom(troupe._id, descriptor);
  });
}

/**
 * Ensure that the current user is in the one-to-one room
 */
function ensureFromUserInRoom(troupeId, fromUserId) {
  return roomMembershipService.checkRoomMembership(troupeId, fromUserId)
    .then(function(isRoomMember) {
      if (isRoomMember) return;

      // Deal with https://github.com/troupe/gitter-webapp/issues/1227
      return userDefaultFlagsService.getDefaultFlagsForUserId(fromUserId)
        .then(function(flags) {
          return roomMembershipService.addRoomMember(troupeId, fromUserId, flags);
        });
    });
}

/**
 * Ensure that both users are in the one-to-one room
 */
function addOneToOneUsersToNewRoom(troupeId, fromUserId, toUserId) {
  return userDefaultFlagsService.getDefaultFlagsForUserIds([fromUserId, toUserId])
    .then(function(userFlags) {
      var fromUserFlags = userFlags[fromUserId];
      var toUserFlags = userFlags[toUserId];

      if (!fromUserFlags) throw new StatusError(404);
      if (!toUserFlags) throw new StatusError(404);

      return Promise.join(
        roomMembershipService.addRoomMember(troupeId, fromUserId, fromUserFlags),
        roomMembershipService.addRoomMember(troupeId, toUserId, toUserFlags));
    });
}

/**
 * Find a one-to-one troupe, otherwise create it
 *
 * @return {[ troupe, other-user ]}
 */
function findOrCreateOneToOneRoom(fromUserId, toUserId) {
  assert(fromUserId, "Need to provide fromUserId");
  assert(toUserId, "Need to provide toUserId");

  fromUserId = mongoUtils.asObjectID(fromUserId);
  toUserId = mongoUtils.asObjectID(toUserId);

  if(mongoUtils.objectIDsEqual(fromUserId, toUserId)) throw new StatusError(417); // You cannot be in a troupe with yourself.

  return userService.findById(toUserId)
    .bind({
      toUser: undefined,
      troupe: undefined
    })
    .then(function(toUser) {
      if(!toUser) throw new StatusError(404, "User does not exist");

      if (toUser.state === 'INVITED') throw new StatusError(403, 'Cannot create a one-to-one room for a INVITED user');

      this.toUser = toUser;
      return findExistingOneToOneRoom(fromUserId, toUserId);
    })
    .then(function(existingRoom) {
      if (existingRoom) {
        return [existingRoom, true];
      }

      // Do not allow new rooms to be created for REMOVED users
      if (this.toUser.state === 'REMOVED') {
        throw new StatusError(403, 'Cannot create a one-to-one room for a REMOVED user');
      }

      return upsertNewOneToOneRoom(fromUserId, toUserId);
    })
    .spread(function(troupe, isAlreadyExisting) {
      debug('findOrCreate isAlreadyExisting=%s', isAlreadyExisting);

      var troupeId = troupe._id;
      this.troupe = troupe;

      if (isAlreadyExisting) {
        return ensureFromUserInRoom(troupeId, fromUserId);
      } else {
        stats.event('new_troupe', {
          troupeId: troupeId,
          oneToOne: true,
          userId: fromUserId
        });

        return addOneToOneUsersToNewRoom(troupeId, fromUserId, toUserId);
      }
    })
    .then(function() {
      return [this.troupe, this.toUser];
    });
}


function findOneToOneRoom(fromUserId, toUserId) {
  assert(fromUserId, "Need to provide fromUserId");
  assert(toUserId, "Need to provide toUserId");

  fromUserId = mongoUtils.asObjectID(fromUserId);
  toUserId = mongoUtils.asObjectID(toUserId);

  if(String(fromUserId) === String(toUserId)) throw new StatusError(417); // You cannot be in a troupe with yourself.

  /* Find the existing one-to-one.... */
  return persistence.Troupe.findOne(getOneToOneRoomQuery(fromUserId, toUserId))
    .exec();
}

/* Exports */
exports.findOrCreateOneToOneRoom = Promise.method(findOrCreateOneToOneRoom);
exports.findOneToOneRoom = Promise.method(findOneToOneRoom);
