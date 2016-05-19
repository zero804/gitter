#!/usr/bin/env node
/* jshint node:true, unused:true */
'use strict';

var persistence = require('gitter-web-persistence');
var legacyMigration = require('gitter-web-permissions/lib/legacy-migration');
var policyFactory = require('gitter-web-permissions/lib/policy-factory');
var legacyPolicyFactory = require('gitter-web-permissions/lib/legacy-policy-factory');
var Promise = require('bluebird');
var assert = require('assert');

function getSomeRooms() {
  return persistence.Troupe
    .aggregate([
      // { $match: {
      //     oneToOne: { $ne: true },
      //   }
      // },
      { $sample: { size: 100 } },
      { $lookup: {
          from: "troupes",
          localField: "parentId",
          foreignField: "_id",
          as: "parent"
        }
      },
      { $lookup: {
          from: "users",
          localField: "ownerUserId",
          foreignField: "_id",
          as: "owner"
        }
      },
      { $unwind: {
          path: "$parent",
          preserveNullAndEmptyArrays: true
        }
      },
      { $unwind: {
          path: "$owner",
          preserveNullAndEmptyArrays: true
        }
      }
    ])
    .read('secondaryPreferred')
    .exec();
}

function getSomeUsers() {
  return persistence.User
    .aggregate([
      { $match: { githubUserToken: { $ne: null } } },
      { $sample: { size: 500 } },
    ])
    .read('secondaryPreferred')
    .exec();
}

/**
 * Test against a user who is known to be in the room
 */
function compareOneToOneRoomResultsFor(userId, room, perms) {
  return persistence.User.findById(userId)
    .then(function(user) {
      if (!user) return;
      return compareGroupRoomResultsFor(user, room, perms);
    });

}

function compareGroupRoomResultsFor(user, room, perms) {
  var policy = policyFactory.createPolicyFromDescriptor(user, perms, room._id);
  return Promise.props({
      canRead: policy.canRead(),
      canWrite: policy.canWrite(),
      canJoin: policy.canJoin(),
      canAdmin: policy.canAdmin(),
      canAddUser: policy.canAddUser(),
    })
    .then(function(newPerms) {
      return legacyPolicyFactory.createPolicyForRoom(user, room)
        .then(function(legacyPolicy) {
          return Promise.props({
              canRead: legacyPolicy.canRead(),
              canWrite: legacyPolicy.canWrite(),
              canJoin: legacyPolicy.canJoin(),
              canAdmin: legacyPolicy.canAdmin(),
              canAddUser: legacyPolicy.canAddUser(),
            })
            .then(function(oldPerms) {
              assert.deepEqual(newPerms, oldPerms);
            })
        });
    });
}


function dryRun() {
  return Promise.join(
      getSomeRooms(),
      getSomeUsers(),
      function(results, users) {
        var fail = 0;
        var success = 0;
        return Promise.map(results, function(room, index) {
          var parent = room.parent;
          var owner = room.owner;
          delete room.parent;
          delete room.owner;
          var perms = legacyMigration.generatePermissionsForRoom(room, parent, owner);
          var user = users[index % users.length];

          return (room.oneToOne ?
            compareOneToOneRoomResultsFor(room.oneToOneUsers[0].userId, room, perms) :
            compareGroupRoomResultsFor(user, room, perms))
            .then(function() {
              success++;
            })
            .catch(function(e) {
              console.log('ROOM', room);
              console.log('PERMS', perms);
              console.log('user', user.username);
              fail++;
              console.log(e.stack);
            });

        }, { concurrency: 1 })
        .then(function() {
          console.log('FAILED', fail);
          console.log('SUCCESS', success);
        });

      });
}

dryRun()
  .then(function() {
    process.exit();
  })
  .done();
