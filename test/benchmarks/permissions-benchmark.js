/* jshint node:true, unused:true */
'use strict';

var makeBenchmark = require('../make-benchmark');
var persistence = require('gitter-web-persistence');
var legacyMigration = require('gitter-web-permissions/lib/legacy-migration');
var policyFactory = require('gitter-web-permissions/lib/policy-factory');
var Promise = require('bluebird');

var count = 0;
function getSomeRooms() {
  return persistence.Troupe
    .aggregate([
      // { $match: {
      //     oneToOne: { $ne: true },
      //   }
      // },
      { $sample: { size: 3 } },
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

var roomAndPerms;
var users;

makeBenchmark({
  maxTime: 3,
  initCount: 100,
  before: function(done) {
    return Promise.join(
      getSomeRooms(),
      getSomeUsers(),
      function(rooms, _users) {
        users = _users;
        roomAndPerms = rooms.map(function(room) {
            try {
              var parent = room.parent;
              var owner = room.owner;
              delete room.parent;
              delete room.owner;
              var perms = legacyMigration.generatePermissionsForRoom(room, parent, owner);
              return { room: room, perms: perms };
            } catch(e) {
              /* */
            }
          })
          .filter(function(f) {
            return !!f;
          });
      })
      .asCallback(done);
  },


  tests: {
    'new#canRead': function(done) {
      count++
      var user = users[count % users.length];
      var room = roomAndPerms[count % roomAndPerms.length].room;
      var perms = roomAndPerms[count % roomAndPerms.length].perms;
      var policy = policyFactory.createPolicyFromDescriptor(user, perms, room._id);

      return policy.canRead()
        .asCallback(done);
    },

    'new#canWrite': function(done) {
      count++
      var user = users[count % users.length];
      var room = roomAndPerms[count % roomAndPerms.length].room;
      var perms = roomAndPerms[count % roomAndPerms.length].perms;
      var policy = policyFactory.createPolicyFromDescriptor(user, perms, room._id);

      return policy.canWrite()
        .asCallback(done);
    },

  }

});
