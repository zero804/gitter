#!/usr/bin/env node
'use strict';

var _ = require('lodash');
var shutdown = require('shutdown');
var persistence = require('gitter-web-persistence');
var mongooseUtils = require('gitter-web-persistence-utils/lib/mongoose-utils');
var onMongoConnect = require('../../server/utils/on-mongo-connect');
var through2Concurrent = require('through2-concurrent');


function getGroupableRooms() {
  return persistence.Troupe.aggregate([
      {
        $match: {
          githubType: {
            $nin: ['ONETOONE']
          },
          lcOwner: { $exists: true, $ne: null },
          groupId: { $exists: false }
        }
      },
      {
        $project: {
          uri: 1,
          lcOwner: 1,
          githubType: 1,
          parentId: 1,
          ownerUserId: 1
        }
      },
      {
        $group: {
          _id: '$lcOwner',
          rooms: { $push: '$$CURRENT' }
        }
      }, {
        $lookup: {
          from: "githubusers",
          localField: "_id",
          foreignField: "lcUri",
          as: "githubuser"
        }
      }, {
        $lookup: {
          from: "githuborgs",
          localField: "_id",
          foreignField: "lcUri",
          as: "githuborg"
        }
      }
    ])
    .read('secondaryPreferred')
    .cursor({ batchSize: 1000 })
    // Why exec() before stream() unlike every other instance of .stream() in
    // the app? Aggregate returns different cursors/reponses to find and the
    // rest.
    .exec()
    .stream();
}

function gatherBatchInfo(batch) {
  var lcOwner = batch._id;

  var type;
  var owner;
  if (batch.githuborg.length) {
    type = 'org';
    owner = batch.githuborg[0];

  } else if (batch.githubuser.length) {
    type = 'user';
    owner = batch.githubuser[0];
  } else {
    // TODO: after figuring out what to do about the rest, we'll do something
    // about this. But this number will also go down if we rename some things.
    type = 'unknown';
  }

  /*
  // in case we add groups for the "probably" cases.
  var githubTypeMap = {};
  batch.rooms.forEach(function(room) {
    githubTypeMap[room.githubType] = true;
  });

  var hasOrgRoom = !!(githubTypeMap['ORG'] || githubTypeMap['ORG_CHANNEL']);
  var hasUserRoom = !!githubTypeMap['USER_CHANNEL'];

  var result;
  if (hasOrgRoom || isDefinitelyOrg) {
    result = "YES";
  } else if (hasUserRoom || isDefinitelyUser) {
    result = "NO";
  } else {
    result = "MAYBE";
  }

  var owner = uniqueOwners[0];
  */

  var info = {
    type: type,
    owner: owner
  };

  return info;
}

function log(batch, enc, callback) {
  var lcOwner = batch._id;
  var info = gatherBatchInfo(batch);

  console.log(
    lcOwner,
    info.type,
    info.owner && info.owner.uri,
    batch.rooms.length
  );

  callback();
}

function migrate(batch, enc, callback) {
  var lcOwner = batch._id;
  var info = gatherBatchInfo(batch);

  console.log(
    lcOwner,
    info.type,
    info.owner && info.owner.uri,
    batch.rooms.length
  );

  if (info.type == 'unknown') {
    return callback();
  }

  // upsert the lcOwner into group
  var query = { lcUri: lcOwner };
  return mongooseUtils.upsert(persistence.Group, query, {
      // only set on insert because we don't want to override name or forumId
      // or anything like that
      $setOnInsert: {
        name: info.owner.uri,
        uri: info.owner.uri,
        lcUri: info.owner.lcUri,
        type: info.type,
        githubId: info.owner.githubId // could be null
      }
    })
    .spread(function(group, existing) {
      // whether or not a new one was inserted we have to fill in the missing
      // groupId for the batch anyway
      var groupId = group._id;
      return persistence.Troupe.update({
          lcOwner: lcOwner,
          // strip out things that shouldn't have a group just in case
          githubType: {
            $nin: ['ONETOONE', 'USER_CHANNEL']
          },
          // only the missing ones
          groupId: { $exists: false }
        }, {
          $set: { groupId: groupId }
        })
        .exec();
    })
    .nodeify(callback);
}

function run(f, callback) {
  getGroupableRooms()
    .pipe(through2Concurrent.obj({maxConcurrency: 10}, f))
    .on('data', function(batch) {
    })
    .on('end', function() {
      console.log('done!');
      callback();
    })
    .on('error', function(error) {
      callback(error);
    })
}

function done(error) {
  if (error) {
    console.error(error);
    console.error(error.stack);
    process.exit(1);
  } else {
    shutdown.shutdownGracefully();
  }
}

onMongoConnect()
  .then(function() {
    require('yargs')
      .command('dry-run', 'Dry run', { }, function() {
        run(log, done);
      })
      .command('execute', 'Execute', { }, function() {
        run(migrate, function(err) {
          done(err);
        });
      })
      .demand(1)
      .strict()
      .help('help')
      .alias('help', 'h')
      .argv;
  });
