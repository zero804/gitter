"use strict";

var SecurityDescriptor = require('gitter-web-persistence').SecurityDescriptor;
var mongooseUtils = require('gitter-web-persistence-utils/lib/mongoose-utils');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');

function getForRoomUser(roomId, userId) {
  var projection = {
    _id: 0,
    type: 1,
    members: 1,
    admins: 1,
    public: 1,
    linkPath: 1,
    externalId: 1,
  };

  if (userId) {
    var elemMatch = { $elemMatch: { $eq: userId } };
    projection.oneToOneUsers = { $elemMatch: { userId: userId } };
    // projection.bans = elemMatch; TODO ADD BANS
    projection.extraMembers = elemMatch;
    projection.extraAdmins = elemMatch;
  }

  var query = {
    troupeId: roomId
  };

  return SecurityDescriptor.findOne(query, projection, { lean: true })
    .exec();
}

/**
 * Returns true if an existing policy was updated
 */
function insertPolicyForRoom(roomId, policy) {
  roomId = mongoUtils.asObjectID(roomId);

  // TODO: validate the policy
  var setOperation = {
    $setOnInsert: {
      troupeId: roomId,
      type: policy.type,
      members: policy.members,
      admins: policy.admins,
      public: policy.public,
      linkPath: policy.linkPath,
      externalId: policy.externalId,
    }
  };

  // if (policy.bans && policy.bans.length) {
  //   setOperation.$setOnInsert.bans = mongoUtils.asObjectIDS(policy.extraMembers);
  // }

  if (policy.extraMembers && policy.extraMembers.length) {
    setOperation.$setOnInsert.extraMembers = mongoUtils.asObjectIDS(policy.extraMembers);
  }

  if (policy.extraAdmins && policy.extraAdmins.length) {
    setOperation.$setOnInsert.extraAdmins = mongoUtils.asObjectIDS(policy.extraAdmins);
  }

  return mongooseUtils.leanUpsert(SecurityDescriptor, { troupeId: roomId }, setOperation)
    .exec()
    .then(function(existing) {
      return !existing;
    });
}

module.exports = {
  getForRoomUser: getForRoomUser,
  insertPolicyForRoom: insertPolicyForRoom
};
