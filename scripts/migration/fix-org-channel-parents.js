#!/usr/bin/env node
/* jshint node:true, unused:true */
'use strict';

var persistence = require('gitter-web-persistence');
var Promise = require('bluebird');
var _ = require('lodash');
var cliff = require('cliff');


function getOrgChannelsWithIncorrectParent() {
  return persistence.Troupe
    .aggregate([
      { $match: { githubType: 'ORG_CHANNEL' } },
      { $lookup: {
          from: "troupes",
          localField: "parentId",
          foreignField: "_id",
          as: "parent"
        }
      },
      { $unwind: {
          path: "$parent",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 1,
          uri: 1,
          lcOwner: "$lcOwner",
          parent: "$parent",
          parentLcUri: "$parent.lcUri",
          uriMatches: { $eq: ["$lcOwner", "$parent.lcUri"] }
        }
      },
      { $match: {
          $or: [
            { "parent": { $exists: false } },
            { "parent": null },
            { "uriMatches": false }
          ]
        }
      },
    ])
    .read('secondaryPreferred')
    .exec();
}

function countRealUsersInRooms(troupeIds) {
  return persistence.TroupeUser
    .aggregate([
      { $match: { troupeId: { $in: troupeIds } } },
      { $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user"
        }
      },
      { $unwind: {
          path: "$user",
        }
      },
      {
        $group: {
          _id: "$troupeId",
          count: { $sum: 1 }
        }
      }
    ])
    .read('secondaryPreferred')
    .exec()
    .then(function(results) {
      return results.reduce(function(memo, result) {
        memo[result._id] = result.count;
        return memo;
      }, {});
    });
}

function keyByField(results,field) {
  return results.reduce(function(memo, result) {
    memo[result[field]] = result;
    return memo;
  }, {});
}

function findOrgRoomsHashed(lcOwners) {
  return persistence.Troupe.find({
      lcUri: { $in: lcOwners },
      githubType: 'ORG'
    })
    .lean()
    .exec()
    .then(function(troupes) {
      return keyByField(troupes, 'lcUri');
    });
}

function getUpdates() {
  return getOrgChannelsWithIncorrectParent()
    .bind({ })
    .then(function(results) {
      this.results = results;
      var lcOwners = _.pluck(results, 'lcOwner');
      var troupeIds = _.pluck(results, '_id');

      return [countRealUsersInRooms(troupeIds), findOrgRoomsHashed(lcOwners)];
    })
    .spread(function(userCounts, orgsHashed) {
      return this.results.map(function(troupe) {
        var correctParent = orgsHashed[troupe.lcOwner];
        var count = userCounts[troupe._id] || 0;

        return {
          _id: troupe._id,
          uri: troupe.uri,
          originalParentId: troupe.parentId,
          originalOwnerUserId: troupe.ownerUserId,
          correctParentId: correctParent && correctParent._id,
          correctParentUri: correctParent && correctParent.uri,
          userCount: count
        };
      });
    });
}

function dryRun() {
  return getUpdates()
    .then(function(updates) {
      console.log(cliff.stringifyObjectRows(updates, ['_id', 'uri', 'originalParentId', 'originalOwnerUserId', 'correctParentId', 'correctParentUri', 'userCount']));
    });
}


function execute() {
  console.log('# reticulating splines....');

  return getUpdates()
    .then(function(updates) {
      console.log('# performing ', updates.length, 'updates');
      var count = 0;
      return Promise.map(updates, function(update) {
        count++;
        if (count % 10 === 0) {
          console.log('# completed ', count);
        }

        var troupeId = update._id;
        var parentId = update.correctParentId || null;

        return persistence.Troupe.update({
            _id: troupeId,
            githubType: 'ORG_CHANNEL'
          }, {
            $unset: { ownerUserId: true },
            $set: { parentId: parentId }
          })
          .exec();
      }, { concurrency: 10 });
    });
}

require('yargs')
  .command('dry-run', 'Dry run', { }, function() {
    return dryRun()
      .then(function() {
        process.exit();
      })
      .done();
  })
  .command('execute', 'Execute', { }, function() {
    return execute()
      .delay(1000)
      .then(function() {
        process.exit();
      })
      .done();
  })
  .demand(1)
  .strict()
  .help('help')
  .alias('help', 'h')
  .argv;
