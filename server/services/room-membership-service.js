"use strict";

var persistence          = require('./persistence-service');
var TroupeUser           = persistence.TroupeUser;
var Troupe               = persistence.Troupe;
var mongoUtils           = require("../utils/mongo-utils");
var Promise              = require('bluebird');
var EventEmitter         = require('events').EventEmitter;
var assert               = require('assert');
var debug                = require('debug')('gitter:room-membership-service');
var recentRoomCore       = require('./core/recent-room-core');
var roomMembershipEvents = new EventEmitter();

/* Exports */
exports.findRoomIdsForUser          = findRoomIdsForUser;
exports.findRoomIdsForUserWithLurk  = findRoomIdsForUserWithLurk;
exports.checkRoomMembership         = checkRoomMembership;
exports.findUserMembershipInRooms   = findUserMembershipInRooms;
exports.findMembershipForUsersInRoom = findMembershipForUsersInRoom;

exports.findMembersForRoom          = findMembersForRoom;
exports.countMembersInRoom          = countMembersInRoom;
exports.findMembersForRoomWithLurk  = findMembersForRoomWithLurk;
exports.addRoomMember               = addRoomMember;
exports.addRoomMembers              = addRoomMembers;
exports.removeRoomMember            = removeRoomMember;
exports.removeRoomMembers           = removeRoomMembers;
exports.findAllMembersForRooms      = findAllMembersForRooms;
exports.findMembersForRoomMulti     = findMembersForRoomMulti;

exports.getMemberLurkStatus         = getMemberLurkStatus;
exports.setMemberLurkStatus         = setMemberLurkStatus;
exports.setMembersLurkStatus        = setMembersLurkStatus;

/* Event emitter */
exports.events                      = roomMembershipEvents;

/**
 * Returns the rooms the user is in
 */
function findRoomIdsForUser(userId) {
  debug("findRoomIdsForUser(%s)", userId);
  assert(userId);

  return TroupeUser.distinct("troupeId", { 'userId': userId })
    .exec();
}

/**
 * Returns the rooms the user is in, with lurk status
 */
function findRoomIdsForUserWithLurk(userId) {
  debug("findRoomIdsForUserWithLurk(%s)", userId);

  assert(userId);

  return TroupeUser.find({ 'userId': userId }, { _id: 0, troupeId: 1, lurk: 1 }, { lean: true })
    .exec()
    .then(function(results) {
      return results.reduce(function(memo, troupeUser) {
        memo[troupeUser.troupeId] = !!troupeUser.lurk;
        return memo;
      }, {});
    });
}

/**
 * Returns true iff the user is a member of the room
 */
function checkRoomMembership(troupeId, userId) {
  assert(troupeId);
  assert(userId);

  return TroupeUser.count({ troupeId: troupeId, userId: userId })
    .exec()
    .then(function(count) {
      return count > 0;
    });
}

/**
 * Given a set of rooms, will return a subset in which the user
 * is a member
 */
function findUserMembershipInRooms(userId, troupeIds) {
  assert(userId);
  if (!troupeIds.length) return Promise.resolve([]);

  if (troupeIds.length === 1) {
    // Optimise for single troupeIds, which happens a lot
    return checkRoomMembership(troupeIds[0], userId)
      .then(function(isMember) {
        return isMember ? troupeIds : [];
      });
  }

  return TroupeUser.distinct("troupeId", { troupeId: { $in: mongoUtils.asObjectIDs(troupeIds) }, userId: userId })
    .exec();
}

/**
 * Given a set of users, will return a subset of those users
 * who are in the room
 */
function findMembershipForUsersInRoom(troupeId, userIds) {
  assert(troupeId);
  if (!userIds.length) return Promise.resolve([]);

  return TroupeUser.distinct("userId", { userId: { $in: mongoUtils.asObjectIDs(userIds) }, troupeId: troupeId })
    .exec();
}

/**
 * Find the userIds of all the members of a room.
 */
function findMembersForRoom(troupeId, options) {
  assert(troupeId);

  var query = TroupeUser.find({ troupeId: troupeId }, { _id: 0, userId: 1 }, { lean: true });
  if (options && options.skip) {
    query.skip(options.skip);
  }
  if (options && options.limit) {
    query.limit(options.limit);
  }

  return query.exec()
    .then(function(results) {
      return results.map(function(troupeUser) { return troupeUser.userId; });
    });
}

/**
 * Find the userIds of all the members of a room.
 */
function countMembersInRoom(troupeId) {
  assert(troupeId);

  return TroupeUser.count({ troupeId: troupeId }).exec();
}

/**
 * Returns a hash of users in the room their lurk status as the value
 */
function findMembersForRoomWithLurk(troupeId) {
  assert(troupeId);

  return TroupeUser.find({ troupeId: troupeId }, { _id: 0, userId: 1, lurk: 1 }, { lean: true })
    .exec()
    .then(function(results) {
      return results.reduce(function(memo, v) {
        memo[v.userId] = !!v.lurk;
        return memo;
      }, {});
    });
}

/**
 * Add a single user to a room. Returns true if the
 * user was added, false if they were already in the
 * room
 */
function addRoomMember(troupeId, userId) {
  debug('Adding member %s to room %s', userId, troupeId);

  assert(troupeId);
  assert(userId);

  return TroupeUser.findOneAndUpdate({
      troupeId: troupeId,
      userId: userId
    }, {
      $setOnInsert: {
        troupeId: troupeId,
        userId: userId
      }
    }, { upsert: true, new: false })
    .exec()
    .then(function(previous) {
      var added = !previous;

      if (!added) {
        debug('Member %s is already in room %s', userId, troupeId);
        return false;
      }

      // Set the last access time for the user to now if the user
      // has just been added to the room
      return recentRoomCore.saveUserTroupeLastAccess(userId, troupeId)
        .then(function() {
          roomMembershipEvents.emit("members.added", troupeId, [userId]);

          return incrementTroupeUserCount(troupeId, 1);
        })
        .thenReturn(added);
    });

}
/**
 * Adds members to a room.
 * NB: expects the mongo connection to already be established
 *
 * Returns an array of the users who were added...
 */
function addRoomMembers(troupeId, userIds) {
  debug('Adding %s members to room %s', userIds.length, troupeId);

  assert(troupeId);
  if (!userIds.length) return Promise.resolve();
  userIds.forEach(function(userId) {
    assert(userId);
  });

  var bulk = TroupeUser.collection.initializeUnorderedBulkOp();

  troupeId = mongoUtils.asObjectID(troupeId);

  userIds.forEach(function(userId) {
    userId = mongoUtils.asObjectID(userId);

    bulk.find({ troupeId: troupeId, userId: userId })
      .upsert()
      .updateOne({ $setOnInsert: { troupeId: troupeId, userId:userId } });
  });

  return Promise.fromCallback(function(callback) {
      bulk.execute(callback);
    })
    .then(function(bulkResult) {
      var upserted = bulkResult.getUpsertedIds();

      var addedUserIds = upserted.map(function(upsertedDoc) {
        return userIds[upsertedDoc.index];
      });

      if (!addedUserIds.length) return addedUserIds;

      roomMembershipEvents.emit("members.added", troupeId, addedUserIds);

      return incrementTroupeUserCount(troupeId, addedUserIds.length)
        .thenReturn(addedUserIds);
    });
}

/**
 * Remove a single person from a room. Returns
 * true if the user was deleted, false if they
 * were not in the room
 */
function removeRoomMember(troupeId, userId) {
  debug('Removing member %s from room %s', userId, troupeId);

  assert(troupeId);
  assert(userId);

  return TroupeUser.findOneAndRemove({
      troupeId: troupeId,
      userId: userId
    })
    .exec()
    .then(function(existing) {
      var removed = !!existing;

      if (!removed) return false;

      roomMembershipEvents.emit("members.removed", troupeId, [userId]);
      return incrementTroupeUserCount(troupeId, -1)
        .thenReturn(true);
    });
}

/**
 * Remove users from a room
 */
function removeRoomMembers(troupeId, userIds) {
  debug('Removing %s members from room %s', userIds.length, troupeId);

  assert(troupeId);
  if (!userIds.length) return Promise.resolve();

  userIds.forEach(function(userId) {
    assert(userId);
  });

  return TroupeUser.remove({
      troupeId: troupeId,
      userId: { $in: mongoUtils.asObjectIDs(userIds) }
    })
    .exec()
    .then(function() {
      // Unfortunately we have no way of knowing which of the users
      // were actually removed and which were already out of the collection
      // as we have no transactions.
      //
      roomMembershipEvents.emit("members.removed", troupeId, userIds);

      return resetTroupeUserCount(troupeId);
    });
}

/**
 * Returns a list of all room members for an array of rooms
 */
function findAllMembersForRooms(troupeIds) {
  if(!troupeIds.length) return Promise.resolve([]);
  troupeIds.forEach(function(troupeIds) {
    assert(troupeIds);
  });

  return TroupeUser.distinct("userId", { troupeId: { $in: mongoUtils.asObjectIDs(troupeIds) } })
    .exec();
}

/**
 * Fetch the membership of multiple rooms, returns
 * a hash keyed by the roomId, with a userId array
 * as the value
 */
function findMembersForRoomMulti(troupeIds) {
  if(!troupeIds.length) return Promise.resolve({});
  troupeIds.forEach(function(troupeIds) {
    assert(troupeIds);
  });

  return TroupeUser.find({ troupeId: { $in: mongoUtils.asObjectIDs(troupeIds) } }, { _id: 0, troupeId: 1, userId: 1 })
    .exec()
    .then(function(troupeUsers) {
      return troupeUsers.reduce(function(memo, troupeUser) {
        var troupeId = troupeUser.troupeId;
        var userId = troupeUser.userId;

        if (!memo[troupeId]) {
          memo[troupeId] = [userId];
        } else {
          memo[troupeId].push(userId);
        }

        return memo;
      }, {});
    });
}

/**
 * Returns the lurk status of a single user
 * Returns true when lurking, false when not, null when user is not found
 */
function getMemberLurkStatus(troupeId, userId) {
  return TroupeUser.findOne({ troupeId: troupeId, userId: userId }, { lurk: 1, _id: 0 }, { lean: true })
    .exec()
    .then(function(troupeUser) {
       if (!troupeUser) return null;
       return !!troupeUser.lurk;
    });
}

/**
 * Sets a member to be lurking or not lurking.
 * Returns true when things changed
 */
function setMemberLurkStatus(troupeId, userId, lurk) {
  lurk = !!lurk; // Force boolean

  return TroupeUser.findOneAndUpdate({ troupeId: troupeId, userId: userId }, { $set: { lurk: lurk } })
    .exec()
    .then(function(oldTroupeUser) {
       if (!oldTroupeUser) return false;
       var changed = oldTroupeUser.lurk !== lurk;

       if (changed) {
         roomMembershipEvents.emit("members.lurk.change", troupeId, [userId], lurk);
       }

       return changed;
    });
}

/**
 * Sets a group of multiple members lurk status.
 */
function setMembersLurkStatus(troupeId, userIds, lurk) {
 lurk = !!lurk; // Force boolean

 return TroupeUser.update({ troupeId: troupeId, userId: { $in: mongoUtils.asObjectIDs(userIds) } }, { $set: { lurk: lurk } }, { multi: true })
  .exec()
  .then(function() {
    // Unfortunately we have no way of knowing which of the users
    // were actually removed and which were already out of the collection
    // as we have no transactions.
    //
    roomMembershipEvents.emit("members.lurk.change", troupeId, userIds, lurk);
  });
}

/**
 * Update the userCount value for a room
 */
function incrementTroupeUserCount(troupeId, incrementValue) {
  return Troupe.update({ _id: troupeId }, { $inc: { userCount: incrementValue } })
    .exec();
}

function resetTroupeUserCount(troupeId) {
  return countMembersInRoom(troupeId)
    .then(function(count) {
      return Troupe.update({ _id: troupeId }, { $set: { userCount: count } })
        .exec();
    });
}
