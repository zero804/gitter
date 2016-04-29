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
 * Returns true if an existing descriptor was updated
 */
function insertForRoom(roomId, descriptor) {
  roomId = mongoUtils.asObjectID(roomId);

  // TODO: validate the descriptor
  var setOperation = {
    $setOnInsert: {
      troupeId: roomId,
      type: descriptor.type,
      members: descriptor.members,
      admins: descriptor.admins,
      public: descriptor.public,
      linkPath: descriptor.linkPath,
      externalId: descriptor.externalId,
    }
  };

  // if (descriptor.bans && descriptor.bans.length) {
  //   setOperation.$setOnInsert.bans = mongoUtils.asObjectIDS(descriptor.extraMembers);
  // }

  if (descriptor.extraMembers && descriptor.extraMembers.length) {
    setOperation.$setOnInsert.extraMembers = mongoUtils.asObjectIDs(descriptor.extraMembers);
  }

  if (descriptor.extraAdmins && descriptor.extraAdmins.length) {
    setOperation.$setOnInsert.extraAdmins = mongoUtils.asObjectIDs(descriptor.extraAdmins);
  }

  return mongooseUtils.leanUpsert(SecurityDescriptor, { troupeId: roomId }, setOperation)
    .then(function(existing) {
      return !existing;
    });
}

module.exports = {
  getForRoomUser: getForRoomUser,
  insertForRoom: insertForRoom
};
