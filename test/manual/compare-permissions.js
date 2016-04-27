#!/usr/bin/env node
/* jshint node:true, unused:true */
'use strict';

var persistence = require('gitter-web-persistence');
var legacyMigration = require('gitter-web-permissions/lib/legacy-migration');
var policyFactory = require('gitter-web-permissions/lib/policy-factory');
var roomPermissionsModel = require('gitter-web-permissions/lib/room-permissions-model');
var userCanAccessRoom = require('gitter-web-permissions/lib/user-can-access-room');
var Promise = require('bluebird');
var assert = require('assert');

function getSomeRooms() {
  return persistence.Troupe
    .aggregate([
      // { $match: {
      //     oneToOne: { $ne: true },
      //   }
      // },
      { $sample: { size: 50 } },
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
      { $sample: { size: 50 } },
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

      var policy = policyFactory.createPolicyFromDescriptor(user, perms, room._id);
      return Promise.props({
          canRead: policy.canRead(),
          canWrite: policy.canWrite(),
          canJoin: policy.canJoin(),
          canAdmin: policy.canAdmin(),
          canAddUser: policy.canAddUser(),
        })
        .then(function(permDetails) {
          return Promise.join(
            userCanAccessRoom.permissionToRead(user._id, room._id),
            userCanAccessRoom.permissionToWrite(user._id, room._id),
            function(read, write) {
              assert.strictEqual(permDetails.canRead, read, 'NEW result for `permissionToRead` was ' + permDetails.canRead + ' OLD RESULT was ' + read);
              assert.strictEqual(permDetails.canWrite, write, 'NEW result for `permissionToWrite` was ' + permDetails.canWrite + ' OLD RESULT was ' + write);
            })
            .catch(function(e) {
              console.log('ROOM', room);
              console.log('PERMS', perms);
              console.log('user', user.username);
              console.log('new', permDetails);
              throw e;
            });
        });
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
    .then(function(x) {
      return roomPermissionsModel(user, 'view', room)
        .then(function(result) {
          assert.strictEqual(x.canRead, result, 'NEW result for `view` was ' + x.canRead + ' OLD RESULT was ' + result);
          return roomPermissionsModel(user, 'join', room);
        })
        .then(function(result) {
          assert.strictEqual(x.canJoin, result, 'NEW result for `join` was ' + x.canJoin + ' OLD RESULT was ' + result);
          return roomPermissionsModel(user, 'admin', room);
        })
        .then(function(result) {
          assert.strictEqual(x.canAdmin, result, 'NEW result for `admin` was ' + x.canAdmin + ' OLD RESULT was ' + result);
        })
        .then(function() {
          return Promise.join(
            userCanAccessRoom.permissionToRead(user._id, room._id),
            userCanAccessRoom.permissionToWrite(user._id, room._id),
            function(read, write) {
              assert.strictEqual(x.canRead, read, 'NEW result for `permissionToRead` was ' + x.canRead + ' OLD RESULT was ' + read);
              assert.strictEqual(x.canWrite, write, 'NEW result for `permissionToWrite` was ' + x.canWrite + ' OLD RESULT was ' + write);
            });
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

return dryRun()
  .then(function() {
    process.exit();
  })
  .done();
