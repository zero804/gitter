"use strict";

var persistence              = require('./persistence-service');
var TroupeUser               = persistence.TroupeUser;
var mongoUtils               = require("../utils/mongo-utils");
var Q                        = require("q");
var assert                   = require('assert');
var debug                    = require('debug')('gitter:room-membership-service');

/* Exports */
exports.findRoomIdsForUser          = findRoomIdsForUser;
exports.findRoomIdsForUserWithLurk  = findRoomIdsForUserWithLurk;
exports.checkRoomMembership         = checkRoomMembership;
exports.findMembersForRoom          = findMembersForRoom;
exports.countMembersInRoom          = countMembersInRoom;
exports.findMembersForRoomWithLurk  = findMembersForRoomWithLurk;
exports.addRoomMember               = addRoomMember;
exports.addRoomMembers              = addRoomMembers;
exports.removeRoomMember            = removeRoomMember;
exports.removeRoomMembers           = removeRoomMembers;
exports.findAllMembersForRooms      = findAllMembersForRooms;

exports.getMemberLurkStatus         = getMemberLurkStatus;
exports.setMemberLurkStatus         = setMemberLurkStatus;
exports.setMembersLurkStatus        = setMembersLurkStatus;

/**
 * Returns the rooms the user is in
 */
function findRoomIdsForUser(userId) {
  debug("findRoomIdsForUser(%s)", userId);
  assert(userId);

  return TroupeUser.distinctQ("troupeId", { 'userId': userId });
}

/**
 * Returns the rooms the user is in, with lurk status
 */
function findRoomIdsForUserWithLurk(userId) {
  debug("findRoomIdsForUserWithLurk(%s)", userId);

  assert(userId);

  return TroupeUser.findQ({ 'userId': userId }, { _id: 0, troupeId: 1, lurk: 1 }, { lean: true })
    .then(function(results) {
      return results.reduce(function(memo, troupeUser) {
        memo[troupeUser.userId] = !!troupeUser.lurk;
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

  return TroupeUser.countQ({ troupeId: troupeId, userId: userId })
    .then(function(count) {
      return count > 0;
    });
}

/**
 * Find the userIds of all the members of a room.
 */
function findMembersForRoom(troupeId, options) {
  assert(troupeId);

  var query = TroupeUser.find({ troupeId: troupeId }, { _id: 0, userId: 1 }, { lean: true });
  if (options && options.limit) {
    query.limit(options.limit);
  }

  return query.execQ()
    .then(function(results) {
      return results.map(function(troupeUser) { return troupeUser.userId; });
    });
}

/**
 * Find the userIds of all the members of a room.
 */
function countMembersInRoom(troupeId) {
  assert(troupeId);

  return TroupeUser.countQ({ troupeId: troupeId });
}

/**
 * Returns a hash of users in the room their lurk status as the value
 */
function findMembersForRoomWithLurk(troupeId) {
  assert(troupeId);

  return TroupeUser.findQ({ troupeId: troupeId }, { _id: 0, userId: 1, lurk: 1 }, { lean: true })
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
  assert(troupeId);
  assert(userId);

  return TroupeUser.findOneAndUpdateQ({
      troupeId: troupeId,
      userId: userId
    }, {
      $setOnInsert: {
        troupeId: troupeId,
        userId: userId
      }
    }, { upsert: true, new: false })
    .then(function(previous) {
      return !previous;
    });

}
/**
 * Adds members to a room
 * NB: expects the mongo connection to already be established
 */
function addRoomMembers(troupeId, userIds) {
  assert(troupeId);
  if (!userIds.length) return Q.resolve();
  userIds.forEach(function(userId) {
    assert(userId);
  });

  var bulk = TroupeUser.collection.initializeUnorderedBulkOp();

  userIds.forEach(function(userId) {
    bulk.find({ troupeId: troupeId, userId: userId }).upsert().updateOne({
      $setOnInsert: { troupeId: troupeId, userId:userId }
    });
  });

  var d = Q.defer();
  bulk.execute(d.makeNodeResolver());
  return d.promise;
}

/**
 * Remove a single person from a room. Returns
 * true if the user was deleted, false if they
 * were not in the room
 */
function removeRoomMember(troupeId, userId) {
  assert(troupeId);
  assert(userId);

  return TroupeUser.findOneAndRemoveQ({
      troupeId: troupeId,
      userId: userId
    })
    .then(function(existing) {
      return !!existing;
    });
}

/**
 * Remove users from a room
 */
function removeRoomMembers(troupeId, userIds) {
  assert(troupeId);
  if (!userIds.length) return Q.resolve();
  userIds.forEach(function(userId) {
    assert(userId);
  });

  return TroupeUser.removeQ({
    troupeId: troupeId,
    userId: { $in: mongoUtils.asObjectIDs(userIds) }
  });
}

/**
 * Returns a list of all room members for an array of rooms
 */
function findAllMembersForRooms(troupeIds) {
  if(!troupeIds.length) return Q.resolve([]);
  troupeIds.forEach(function(troupeIds) {
    assert(troupeIds);
  });

  return TroupeUser.distinctQ("userId", { troupeId: { $in: mongoUtils.asObjectIDs(troupeIds) } });
}

/**
 * Returns the lurk status of a single user
 * Returns true when lurking, false when not, null when user is not found
 */
function getMemberLurkStatus(troupeId, userId) {
  return TroupeUser.findOneQ({ troupeId: troupeId, userId: userId }, { lurk: 1, _id: 0 }, { lean: true })
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

  return TroupeUser.findOneAndUpdateQ({ troupeId: troupeId, userId: userId }, { $set: { lurk: lurk } })
  .then(function(oldTroupeUser) {
     if (!oldTroupeUser) return false;
     return oldTroupeUser.lurk !== lurk;
  });
}

/**
 * Sets a group of multiple members lurk status.
 */
function setMembersLurkStatus(troupeId, userIds, lurk) {
 lurk = !!lurk; // Force boolean

 return TroupeUser.update({ troupeId: troupeId, userId: { $in: mongoUtils.asObjectIDs(userIds) } }, { $set: { lurk: lurk } }, { multi: true });
}
