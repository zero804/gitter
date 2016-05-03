#!/usr/bin/env node
/* jshint node:true, unused:true */
'use strict';

var persistence = require('gitter-web-persistence');
var Promise = require('bluebird');
var _ = require('lodash');
var cliff = require('cliff');
var uriLookupService = require("../../server/services/uri-lookup-service");
var shutdown = require('shutdown');

function getUserChannelsWithRenamedOwner() {
  return persistence.Troupe
    .aggregate([
      { $match: { githubType: 'USER_CHANNEL' } },
      { $lookup: {
          from: "users",
          localField: "ownerUserId",
          foreignField: "_id",
          as: "owner"
        }
      },
      { $unwind: {
          path: "$owner",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          uri: 1,
          lcUri: 1,
          owner: 1,
          security: 1,
          lcOwner: 1,
          ownerUserId: 1,
          username: "$owner.username",
          lcOwnerMatches: { $eq: ["$lcOwner", { $toLower: "$owner.username" }] }
        }
      },
      { $match: {
          lcOwnerMatches: false
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



function findUsersHashed(ownerUserIds) {
  return persistence.User.find({
      _id: { $in: ownerUserIds },
    })
    .lean()
    .exec()
    .then(function(users) {
      return keyByField(users, '_id');
    });
}

function getUpdates() {
  return getUserChannelsWithRenamedOwner()
    .bind({ })
    .then(function(results) {
      this.results = results;
      var troupeIds = _.pluck(results, '_id');
      var ownerIds = _.pluck(results, 'ownerUserId');

      return [countRealUsersInRooms(troupeIds), findUsersHashed(ownerIds)];
    })
    .spread(function(realCounts, usersHashed) {
      return this.results.map(function(troupe) {
        var ownerUser = usersHashed[troupe.ownerUserId];
        var count = realCounts[troupe._id] || 0;

        var newUri;
        if (ownerUser && ownerUser.username) {
          newUri = ownerUser.username + '/' + troupe.uri.split(/\//)[1];
        }

        return {
          _id: troupe._id,
          uri: troupe.uri,
          currentLcOwner: troupe.lcOwner,
          correctLcOwner: ownerUser && ownerUser.username && ownerUser.username.toLowerCase(),
          correctUsername: ownerUser && ownerUser.username,
          newUri: newUri,
          userCount: count
        };
      });
    });
}

var renameUserChannel = Promise.method(function (id, oldUri, newUri) {
  if (!newUri) return;
  if (oldUri === newUri) return;
  return persistence.Troupe.findOne({ _id: id, githubType: 'USER_CHANNEL', lcUri: oldUri.toLowerCase() })
    .then(function(channel) {
      if (!channel) {
        console.log('Did not find');
        return;
      }
      var newLcUri = newUri.toLowerCase();
      var newLcOwner = newLcUri.split(/\//)[0].toLowerCase();

      if (newLcUri !== channel.lcUri) {
        channel.renamedLcUris.addToSet(channel.lcUri);
      }

      channel.lcUri = newLcUri;
      channel.uri = newUri;
      channel.lcOwner = newLcOwner;

      return channel.save()
        .then(function() {
          return uriLookupService.removeBadUri(oldUri.toLowerCase());
        })
        .then(function() {
          return uriLookupService.reserveUriForTroupeId(channel.id, newLcUri);
        });
    });
});

function dryRun() {
  return getUpdates()
    .then(function(updates) {
      console.log(cliff.stringifyObjectRows(updates, ['_id', 'uri', 'currentLcOwner', 'correctLcOwner', 'correctUsername', 'newUri', 'userCount']));
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

        return renameUserChannel(update._id, update.uri, update.newUri)
          .catch(function(e) {
            console.log('Unable to rename ' + update.uri, e.message);
          });
      }, { concurrency: 1 });
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
    require('../../server/event-listeners').install();

    return execute()
      .delay(5000)
      .then(function() {
        shutdown.shutdownGracefully();
      })
      .done();
  })
  .demand(1)
  .strict()
  .help('help')
  .alias('help', 'h')
  .argv;
