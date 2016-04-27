#!/usr/bin/env node
/* jshint node:true, unused:true */
'use strict';

var persistence = require('gitter-web-persistence');
var legacyMigration = require('gitter-web-permissions/lib/legacy-migration');
var policyFactory = require('gitter-web-permissions/lib/policy-factory');
var roomPermissionsModel = require('gitter-web-permissions/lib/room-permissions-model');
var Promise = require('bluebird');
var assert = require('assert');

function getSomeRooms() {
  return persistence.Troupe
    .aggregate([
      { $match: {
          oneToOne: { $ne: true },
        }
      },
      { $sample: { size: 10 } },
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


function dryRun() {
  return Promise.join(
      getSomeRooms(),
      getSomeUsers(),
      function(results, users) {
        return Promise.map(results, function(room, index) {
          var parent = room.parent;
          var owner = room.owner;
          delete room.parent;
          delete room.owner;
          var perms = legacyMigration.generatePermissionsForRoom(room, parent, owner);
          var user = users[index % users.length];
          var policy = policyFactory.createPolicyFromDescriptor(user, perms, room._id);
          return Promise.props({
              canRead: policy.canRead(),
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
                .catch(function(e) {
                  console.error(e.stack);
                  console.log('ROOM', room);
                  console.log('PERMS', perms);
                  console.log('user', user.username);
                  console.log('new', x);
                  throw e;
                });

            })
        }, { concurrency: 1 });

      });
}

return dryRun()
  .then(function() {
    process.exit();
  })
  .done();
