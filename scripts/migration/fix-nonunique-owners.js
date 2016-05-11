#!/usr/bin/env node
'use strict';

var _ = require('lodash');
var shutdown = require('shutdown');
var persistence = require('gitter-web-persistence');
var mongooseUtils = require('gitter-web-persistence-utils/lib/mongoose-utils');
var onMongoConnect = require('../../server/utils/on-mongo-connect');
var through2Concurrent = require('through2-concurrent');


function getBatchedRooms() {
    return persistence.Troupe.aggregate([
      {
        $match: {
          githubType: {
            $nin: ['ONETOONE']
          },
          lcOwner: { $exists: true, $ne: null }
        }
      },
      {
        $project: {
          lcOwner: 1,
          uri: 1,
          githubType: 1,
          parentId: 1,
          ownerUserId: 1
        }
      },
      {
        $group: {
          _id: '$lcOwner',
          rooms: { $push: '$$CURRENT' },
          parentIds: { $addToSet: '$$CURRENT.parentId'},
          ownerUserIds: { $addToSet: '$$CURRENT.ownerUserId'}
        }
      /*
      }, {
        $lookup: {
          from: "troupe",
          localfield: "parentIds",
          foreignfield: "_id",
          as: "parents"
        }
      }, {
        $lookup: {
          from: "user",
          localfield: "ownerUserIds",
          foreignfield: "_id",
          as: "users"
        }
      */
      }
    ])
    .read('secondaryPreferred')
    .cursor({ batchSize: 1000 })
    .exec()
    .stream();
}

function run(f, callback) {
  getBatchedRooms()
    .pipe(through2Concurrent.obj({maxConcurrency: 10}, f))
    .on('data', function(batch) {
    })
    .on('end', function() {
      console.log('done!');
      callback();
    })
    .on('error', function(error) {
      console.log("STREAM ERROR");
      callback(err);
    })
}

function done(err) {
  if (err) {
    console.error(error);
    console.error(error.stack);
    process.exit(1);
  } else {
    shutdown.shutdownGracefully();
  }
}

function log(batch, enc, callback) {
  var lcOwner = batch._id;

  var uniqueOwners = _.uniq(batch.rooms.map(function(room) {
    return room.uri.split('/')[0];
  }));

  var uniqueParentIds = batch.parentIds;
  var uniqueOwnerUserIds = batch.ownerUserIds;

  var errors = [];

  if (uniqueOwners.length > 1) {
    errors.push('owners');
  }

  // all unique room ids in this batch
  var idMap = {};
  batch.rooms.forEach(function(room) {
    idMap[room._id] = true;
  });

  // gather info
  var missingParentIdMap = {}
  var ownerUserIdMap = {};
  batch.rooms.forEach(function(room) {
    if (room.parentId && !idMap[room.parentId]) {
      missingParentIdsMap[room.parentId] = true;
    }
    if (room.ownerUserId) {
      ownerUserIdMap[room.ownerUserId] = true;
    }
  });

  // all non-null, non-undefined parentIds MUST be in this batch
  var missingParentIds = Object.keys(missingParentIdMap);
  if (missingParentIds.length) {
    errors.push('parentIds');
  }

  // only one unique, non-null, non-undefined ownerUserId is allowed per batch
  var ownerUserIds = Object.keys(ownerUserIdMap);
  if (ownerUserIds.length > 1) {
    errors.push('ownerUserIds');
  }

  if (errors.length) {
    console.log(lcOwner, errors);
    callback();
  } else {
    callback();
  }
}

function fix(batch, enc, callback) {
  // TODO
  callback();
}

onMongoConnect()
  .then(function() {
    require('yargs')
      .command('dry-run', 'Dry run', { }, function() {
        run(log, done);
      })
      .command('execute', 'Execute', { }, function() {
        run(fix, done);
      })
      .demand(1)
      .strict()
      .help('help')
      .alias('help', 'h')
      .argv;
  });

