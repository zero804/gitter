"use strict";

var persistence          = require('gitter-web-persistence');
var TroupeUser           = persistence.TroupeUser;
var mongoUtils           = require('gitter-web-persistence-utils/lib/mongo-utils');
var Promise              = require('bluebird');
var EventEmitter         = require('events').EventEmitter;
var assert               = require('assert');
var debug                = require('debug')('gitter:room-membership-service');

var groupMembershipEvents = new EventEmitter();

function findGroupsForUser(userId) {
  userId = mongoUtils.asObjectID(userId);
  return TroupeUser.aggregate([
      { $match: { userId: userId } },
      { $project: { troupeId: 1 } },
      { $lookup: {
          from: 'troupes',
          localField: 'troupeId',
          foreignField: '_id',
          as: 'troupe'
        }
      }, {
        $unwind: '$troupe'
      }, {
        $group: { _id: '$troupe.groupId' }
      }, {
        $lookup: {
          from: 'groups',
          localField: '_id',
          foreignField: '_id',
          as: 'group'
        }
      }, {
        $unwind: '$group'
      }, {
        $project: {
          _id: '$group._id',
          name: '$group.name',
          uri: '$group.uri',
          lcUri: '$group.lcUri'
        }
      }])
      .exec()
      .then(function(results) {
        return results;
      });
}

/* Exports */
module.exports = {
  findGroupsForUser: Promise.method(findGroupsForUser),
  events: groupMembershipEvents
};
