"use strict";

var persistence = require('gitter-web-persistence');
var TroupeUser = persistence.TroupeUser;
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var Promise = require('bluebird');
var EventEmitter = require('events').EventEmitter;

var groupMembershipEvents = new EventEmitter();

function findGroupsForUser(userId) {
  userId = mongoUtils.asObjectID(userId);
  return TroupeUser.aggregate([
      { $match: { userId: userId } },
      { $project: { troupeId: 1 } },
      {
        /* Join the troupes onto TroupeUser */
        $lookup: {
          from: 'troupes',
          localField: 'troupeId',
          foreignField: '_id',
          as: 'troupe'
        }
      }, {
        $unwind: '$troupe'
      }, {
        /* Get the unique set of groups that the user is in */
        $group: { _id: '$troupe.groupId' }
      }, {
        /* Join the group documents using the unique set of groupIds for the user */
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
          lcUri: '$group.lcUri',
          sd: {
            type: '$group.sd.type',
            linkPath: '$group.sd.linkPath'
          }
        }
      }])
      .read('primaryPreferred')
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
