'use strict';

var persistence = require('gitter-web-persistence');
var assert = require('assert');
var securityDescriptorValidator = require('../security-descriptor-validator');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var transform = require('./transform');

function SecurityDescriptorService(Model) {
  this.Model = Model;
}

SecurityDescriptorService.prototype.findById = function(id, userId) {
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

  return this.Model.findById(id, projection, { lean: true })
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
};

SecurityDescriptorService.prototype.findExtraAdmins = function findExtraAdminsForModel(id) {
  return this.Model.findById(id, { 'sd.extraAdmins': 1 }, { lean: true })
    .exec()
    .then(function(doc) {
      if (!doc || !doc.sd || !doc.sd.extraAdmins) return [];
      return doc.sd.extraAdmins;
    });
};

SecurityDescriptorService.prototype.findExtraMembers = function findExtraMembersForModel(id) {
  return this.Model.findById(id, { 'sd.extraMembers': 1 }, { lean: true })
    .exec()
    .then(function(doc) {
      if (!doc || !doc.sd || !doc.sd.extraMembers) return [];
      return doc.sd.extraMembers;
    });
};

SecurityDescriptorService.prototype.addExtraAdmin = function(id, userId) {
  assert(userId, 'userId required');
  userId = mongoUtils.asObjectID(userId);

  return this.Model.findByIdAndUpdate(id, {
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
};

SecurityDescriptorService.prototype.removeExtraAdmin = function(id, userId) {
  assert(userId, 'userId required');
  userId = mongoUtils.asObjectID(userId);

  return this.Model.findByIdAndUpdate(id, {
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


SecurityDescriptorService.prototype.updateSecurityDescriptor = function(id, sd) {
  securityDescriptorValidator(sd);
  return this.Model.findByIdAndUpdate(id, {
      $set: {
        'sd': sd
      }
    }, {
      new: true
    })
    .exec()
    .then(function(doc) {
      return doc && doc.sd;
    })
}

SecurityDescriptorService.prototype.modifyType = function(id, newType, options) {
  return this.findById(id)
    .bind(this)
    .then(function(sd) {
      return transform(this.Model, sd, newType, options);
    })
    .then(function(newSd) {
      return this.updateSecurityDescriptor(id, newSd);
    });
}

module.exports = {
  room: new SecurityDescriptorService(persistence.Troupe),
  group: new SecurityDescriptorService(persistence.Group),
  forum: new SecurityDescriptorService(persistence.Forum),
}
