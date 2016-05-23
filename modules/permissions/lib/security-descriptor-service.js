"use strict";

var SecurityDescriptor = require('gitter-web-persistence').SecurityDescriptor;
var mongooseUtils = require('gitter-web-persistence-utils/lib/mongoose-utils');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var assert = require('assert');
var securityDescriptorValidator = require('./security-descriptor-validator');
var StatusError = require('statuserror');

/**
 * @private
 */
function findForQueryAndUser(query, userId) {
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

  return SecurityDescriptor.findOne(query, projection, { lean: true })
    .exec()
    .then(function(descriptor) {
      securityDescriptorValidator(descriptor);
      return descriptor;
    });
}

function getForRoomUser(roomId, userId) {
  var query = {
    troupeId: roomId
  };

  return findForQueryAndUser(query, userId);
}

function getForGroupUser(groupId, userId) {
  var query = {
    groupId: groupId
  };

  return findForQueryAndUser(query, userId);
}

/**
 * @private
 */
function insertForRoomOrGroup(roomId, groupId, descriptor) {
  var query;

  var setOperation = {
    $setOnInsert: {
      type: descriptor.type,
      members: descriptor.members,
      admins: descriptor.admins,
      public: descriptor.public,
      linkPath: descriptor.linkPath,
      externalId: descriptor.externalId,
    }
  };

  if (roomId) {
    assert(!groupId, 'Require either a roomId or a groupId');
    roomId = mongoUtils.asObjectID(roomId);
    groupId = undefined;

    query = { troupeId: roomId };
    setOperation.$setOnInsert.troupeId = roomId;
  } else {
    assert(groupId, 'Require either a roomId or a groupId');
    groupId = mongoUtils.asObjectID(groupId);
    roomId = undefined;
    query = { groupId: groupId };
    setOperation.$setOnInsert.groupId = groupId;
  }

  securityDescriptorValidator(descriptor);



  // if (descriptor.bans && descriptor.bans.length) {
  //   setOperation.$setOnInsert.bans = mongoUtils.asObjectIDS(descriptor.extraMembers);
  // }

  if (descriptor.extraMembers && descriptor.extraMembers.length) {
    setOperation.$setOnInsert.extraMembers = mongoUtils.asObjectIDs(descriptor.extraMembers);
  }

  if (descriptor.extraAdmins && descriptor.extraAdmins.length) {
    setOperation.$setOnInsert.extraAdmins = mongoUtils.asObjectIDs(descriptor.extraAdmins);
  }

  return mongooseUtils.leanUpsert(SecurityDescriptor, query, setOperation)
    .then(function(existing) {
      return !existing;
    });
}

/**
 * Returns true if an existing descriptor was updated
 */
function insertForRoom(roomId, descriptor) {
  return insertForRoomOrGroup(roomId, null, descriptor);
}

function insertForGroup(groupId, descriptor) {
  return insertForRoomOrGroup(null, groupId, descriptor);
}

function updateLinksForRepo(linkPath, newLinkPath, externalId) {
  assert(linkPath, 'linkPath expected');
  assert(newLinkPath, 'newLinkPath expected');

  var parts = newLinkPath.split('/');
  if (parts.length !== 2) {
    throw new StatusError(400, 'Invalid linkPath attribute');
  }

  if (!parts[0].length || !parts[1].length) {
    throw new StatusError(400, 'Invalid linkPath attribute: ' + linkPath);
  }

  var query = {
    type: 'GH_REPO',
    linkPath: linkPath
  };

  var update = {
    $set: {
      linkPath: newLinkPath
    }
  };

  if (externalId) {
    update.$set.externalId = externalId;
  }

  return SecurityDescriptor.update(query, update, { multi: true })
    .exec();
}

module.exports = {
  getForRoomUser: getForRoomUser,
  getForGroupUser: getForGroupUser,
  insertForRoom: insertForRoom,
  insertForGroup: insertForGroup,
  updateLinksForRepo: updateLinksForRepo,
};
