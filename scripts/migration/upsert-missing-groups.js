#!/usr/bin/env node
'use strict';

var shutdown = require('shutdown');
var persistence = require('gitter-web-persistence');
var mongooseUtils = require('gitter-web-persistence-utils/lib/mongoose-utils');
var onMongoConnect = require('../../server/utils/on-mongo-connect');
var through2Concurrent = require('through2-concurrent');
var orgMap = require('./org-map.json');


function getGroupableRooms() {
  return persistence.Troupe.aggregate([
      {
        $match: {
          githubType: {
            $nin: ['ONETOONE', 'USER_CHANNEL']
          },
          lcOwner: { $exists: true, $ne: null },
          groupId: { $exists: false }
        }
      },
      {
        $project: {
          uri: 1,
          lcOwner: 1
        }
      },
      {
        $group: {
          _id: '$lcOwner',
          rooms: { $push: '$$CURRENT' }
        }
      }, {
        $lookup: {
          // NOTE: I'm assuming that troupe.lcUri is maintained and correct
          from: "troupes",
          localField: "_id",
          foreignField: "lcUri",
          as: "orgRoom"
        }
      }, {
        // NOTE: comparing lcOwner (lowercased) with username (mixed case). Not
        // sure of how to find owner (mixed case) at this stage because there
        // is no troupe.owner unless we calculate it somehow.
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "username",
          as: "user"
        }
      }
      // TODO: project orgRoom & user for efficiency
    ])
    .read('secondaryPreferred')
    .cursor({ batchSize: 1000 })
    // Why exec() before stream() unlike every other instance of .stream() in
    // the app? Aggregate returns different cursors/reponses to find and the
    // rest.
    .exec()
    .stream();
}

function log(batch, enc, callback) {
  console.log(batch._id, batch.rooms.length);
  callback();
}

var lookups = [];
function migrate(batch, enc, callback) {
  var lcOwner = batch._id;

  // Fish the owner out of the first room's uri. This is the case-sensitive
  // version used for name and uri.
  var owner = batch.rooms[0].uri.split('/')[0];

  var hasOrgRoom = !!batch.orgRoom.length;
  var hasUser = !!batch.user.length;
  var isDefinitelyOrg = !!orgMap[lcOwner];
  var result;
  if (hasOrgRoom || isDefinitelyOrg) {
    result = "YES";
  } else if (hasUser) {
    result = "NO";
  } else {
    // TODO: maybe here we can somehow lookup owner in users again so we can do
    // a case-sensitive match?
    result = "MAYBE";
    lookups.push(owner);
  }

  console.log(
    owner,
    batch.rooms.length+' rooms',
    'hasOrgRoom:'+hasOrgRoom,
    'hasUser:'+hasUser,
    'isDefinitelyOrg:'+isDefinitelyOrg,
    result
  );

  callback();

  // NOTE: disabling the actual upserting for now while I figure out how to
  // calculate if we need a group

  /*
  // upsert the lcOwner into group
  var query = { lcUri: lcOwner };
  return mongooseUtils.upsert(persistence.Group, query, {
      // only set on insert because we don't want to override name or forumId
      // or anything like that
      $setOnInsert: {
        name: owner,
        uri: owner,
        lcUri: lcOwner
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
  */
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

onMongoConnect()
  .then(function() {
    require('yargs')
      .command('dry-run', 'Dry run', { }, function() {
        run(log, done);
      })
      .command('execute', 'Execute', { }, function() {
        run(migrate, function(err) {
          console.log("numLookups: "+lookups.length);
          console.log('==========')
          console.log(lookups);
          done(err);
        });
      })
      .demand(1)
      .strict()
      .help('help')
      .alias('help', 'h')
      .argv;
  });
