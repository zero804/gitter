'use strict';

var assert = require('assert');
var securityDescriptorValidator = require('../security-descriptor-validator');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');

function findByIdForModel(Model, id, userId) {
  var projection = {
    _id: 0,
    'sd.type': 1,
    'sd.members': 1,
    'sd.admins': 1,
    'sd.public': 1,
    'sd.linkPath': 1,
    'sd.externalId': 1,
    'sd.internalId': 1,
  };

  if (userId) {
    // For legacy reasons, bans hang off the base object (for now)
    projection['bans'] = {
      $elemMatch: {
        userId: userId
      }
    };
    // TODO: selectively elemMath var elemMatch = { $elemMatch: { $eq: userId } };
    projection['sd.extraMembers'] = 1;
    projection['sd.extraAdmins'] = 1;
  }

  return Model.findById(id, projection, { lean: true })
    .exec()
    .then(function(doc) {
      if (!doc || !doc.sd) return null; // TODO: throw 404?
      var sd = doc.sd;
      if (doc.bans) {
        // Move the bans onto sd
        sd.bans = doc.bans;
      }
      securityDescriptorValidator(sd);
      return sd;
    });
}

function findExtraAdminsForModel(Model, id) {
  return Model.findById(id, { 'sd.extraAdmins': 1 }, { lean: true })
    .exec()
    .then(function(doc) {
      if (!doc || !doc.sd || !doc.sd.extraAdmins) return [];
      return doc.sd.extraAdmins;
    });
}

function findExtraMembersForModel(Model, id) {
  return Model.findById(id, { 'sd.extraMembers': 1 }, { lean: true })
    .exec()
    .then(function(doc) {
      if (!doc || !doc.sd || !doc.sd.extraMembers) return [];
      return doc.sd.extraMembers;
    });
}

function addExtraAdminForModel(Model, id, userId) {
  assert(userId, 'userId required');
  userId = mongoUtils.asObjectID(userId);

  return Model.findByIdAndUpdate(id, {
      $addToSet: {
        'sd.extraAdmins': userId
      }
    }, {
      new: false,
      select: {
        _id: 0,
        'sd.extraAdmins': 1
      }
    })
    .exec();
}

function removeExtraAdminForModel(Model, id, userId) {
  assert(userId, 'userId required');
  userId = mongoUtils.asObjectID(userId);

  return Model.findByIdAndUpdate(id, {
      $pullAll: {
        'sd.extraAdmins': [userId]
      }
    }, {
      new: false,
      select: {
        _id: 0,
        'sd.extraAdmins': 1
      }
    })
    .exec();
}


module.exports = {
  findByIdForModel: findByIdForModel,
  findExtraAdminsForModel: findExtraAdminsForModel,
  findExtraMembersForModel: findExtraMembersForModel,
  addExtraAdminForModel: addExtraAdminForModel,
  removeExtraAdminForModel: removeExtraAdminForModel
}
