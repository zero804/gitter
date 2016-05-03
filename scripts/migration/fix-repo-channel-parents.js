#!/usr/bin/env node
'use strict';

var persistence = require('gitter-web-persistence');
var Promise = require('bluebird');
var _ = require('lodash');
var cliff = require('cliff');


function getOrgChannelsWithIncorrectParent() {
  return persistence.Troupe
    .aggregate([
      { $match: { githubType: 'REPO_CHANNEL' } },
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
      { $match: {
          $or: [
            { "parent": { $exists: false } },
            { "parent": null },
          ]
        }
      },
    ])
    .read('secondaryPreferred')
    .exec();
}


function keyByField(results,field) {
  return results.reduce(function(memo, result) {
    memo[result[field]] = result;
    return memo;
  }, {});
}

function findRepoRoomsHashed(ownerLcUris) {
  return persistence.Troupe.find({
      lcUri: { $in: ownerLcUris },
      githubType: 'REPO'
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
      var ownerLcUris = _.map(results, function(troupe) {
        return troupe.lcUri.split(/\//).splice(0, 2).join('/');
      });
      return findRepoRoomsHashed(ownerLcUris);
    })
    .then(function(reposHashed) {
      return this.results.map(function(troupe) {
        var realOwnerLcUri = troupe.lcUri.split(/\//).splice(0, 2).join('/');
        var correctParent = reposHashed[realOwnerLcUri];
        return {
          _id: troupe._id,
          uri: troupe.uri,
          originalParentId: troupe.parentId,
          originalOwnerUserId: troupe.ownerUserId,
          correctParentId: correctParent && correctParent._id,
          correctParentUri: correctParent && correctParent.uri
        };
      });
    });
}

function dryRun() {
  return getUpdates()
    .then(function(updates) {
      console.log(cliff.stringifyObjectRows(updates, ['_id', 'uri', 'originalParentId', 'originalOwnerUserId', 'correctParentId', 'correctParentUri']));
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
            githubType: 'REPO_CHANNEL'
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
