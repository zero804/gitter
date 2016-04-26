#!/usr/bin/env node
/* jshint node:true, unused:true */
'use strict';

var persistence = require('gitter-web-persistence');
var legacyMigration = require('gitter-web-permissions/lib/legacy-migration');
var policyFactory = require('gitter-web-permissions/lib/policy-factory');
var Promise = require('bluebird');

function getSomeRooms() {
  return persistence.Troupe
    .aggregate([
      { $match: { oneToOne: { $ne: true } } },
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
        return Promise.map(results, function(result, index) {
          var parent = result.parent;
          var owner = result.owner;
          delete result.parent;
          delete result.owner;
          var perms = legacyMigration.generatePermissionsForRoom(result, parent, owner);
          var user = users[index % users.length];
          var policy = policyFactory.createPolicyFromDescriptor(user, perms, result._id);

          return Promise.props({
              canRead: policy.canRead(),
              canJoin: policy.canJoin(),
              canAdmin: policy.canAdmin(),
              canAddUser: policy.canAddUser(),
            })
            .then(function(x) {
              console.log('................');
              console.log(result);
              console.log(user);
              console.log(x);
            });
        });

      });
}

return dryRun()
  .then(function() {
    process.exit();
  })
  .done();
