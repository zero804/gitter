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
var assert                    = require('assert');
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
/**
 * Internal method. Find a room for two users or insert the room in the database.
 *
 * Does not handle any business logic...
 *
 * Returns [troupe, existing]
 */
function findOrInsertNewOneToOneRoom(userId1, userId2) {
  var query = getOneToOneRoomQuery(userId1, userId2);

  // First attempt is a simple find...
  return Troupe.findOne(query)
    .exec()
    .then(function(existing) {
      debug('Found existing room? %s', !!existing);

      if (existing) return [existing, true];

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

  if(String(fromUserId) === String(toUserId)) throw new StatusError(417); // You cannot be in a troupe with yourself.

  return userService.findById(toUserId)
    .bind({
      toUser: undefined,
      troupe: undefined
    })
    .then(function(toUser) {
      if(!toUser) throw new StatusError(404, "User does not exist");

      this.toUser = toUser;

      // For now, there is no permissions model between users
      // There is an implicit connection between these two users,
      // automatically create the troupe
      return findOrInsertNewOneToOneRoom(fromUserId, toUserId);
    })
    .spread(function(troupe, existing) {
      debug('findOrCreate existing=%s', existing);

      var troupeId = troupe._id;
      this.troupe = troupe;

      if (existing) {
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
