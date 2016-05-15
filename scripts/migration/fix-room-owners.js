#!/usr/bin/env node
'use strict';

var _ = require('lodash');
var Promise = require('bluebird');
var shutdown = require('shutdown');
var Tentacles = require('tentacles');
var persistence = require('gitter-web-persistence');
var mongooseUtils = require('gitter-web-persistence-utils/lib/mongoose-utils');
var onMongoConnect = require('../../server/utils/on-mongo-connect');
var through2Concurrent = require('through2-concurrent');

/*
var orgMap = require('./org-map.json');
var userMap = require('./user-map.json');

var lcOrgMap = {};
var reverseOrgMap = {};
for (var k in orgMap) {
  lcOrgMap[k.toLowerCase()] = orgMap[k];
  reverseOrgMap[orgMap[k]] = k;
}

var lcUserMap = {};
var reverseUserMap = {};
for (var k in userMap) {
  lcUserMap[k.toLowerCase()] = userMap[k];
  reverseUserMap[userMap[k]] = k;
}
*/

var GITHUB_TOKEN = '***REMOVED***';
var tentacles = new Tentacles({ accessToken: GITHUB_TOKEN });


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
          _id: 1,
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
          rooms: { $push: '$$CURRENT' }
        }
      }
    ])
    .read('secondaryPreferred')
    .cursor({ batchSize: 1000 })
    .exec()
    .stream();
}

function logBatchWarnings(batch, githubTypes) {
  var lcOwner = batch._id;

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
      missingParentIdMap[room.parentId] = true;
    }
    if (room.ownerUserId) {
      ownerUserIdMap[room.ownerUserId] = true;
    }
  });

  // all non-null, non-undefined parentIds MUST be in this batch
  var missingParentIds = Object.keys(missingParentIdMap);
  if (missingParentIds.length) {
    // this doesn't actually occur in our dataset
    console.log(lcOwner, "has parentIds that aren't included in the batch.");
  }

  // only one unique, non-null, non-undefined ownerUserId is allowed per batch
  var ownerUserIds = Object.keys(ownerUserIdMap);
  if (ownerUserIds.length > 1) {
    // this is very rare and we'll have to just fix it manually
    console.log(lcOwner, "has more than one ownerUserId.");
  }

  // if an lcOwner has both an ORG_CHANNEL or ORG room _and_ a USER_CHANNEL,
  // then that's clearly wrong.
  var githubTypeMap = {};
  batch.rooms.forEach(function(room) {
    githubTypeMap[room.githubType] = true;
  });
  if ((githubTypeMap['ORG_CHANNEL'] || githubTypeMap['ORG']) && githubTypeMap['USER_CHANNEL']) {
    // this is very rare and we'll have to just fix it manually
    console.log(lcOwner, "has both org rooms or channels AND user channels.");
  }
}

function findGitHubOrg(lcUri) {
  return persistence.GitHubOrg.findOne({ lcUri: lcUri })
    .read('secondaryPreferred')
    .lean()
    .exec();
}

function findGitHubUser(lcUri) {
  return persistence.GitHubUser.findOne({ lcUri: lcUri })
    .read('secondaryPreferred')
    .lean()
    .exec();
}


// Try and find things wrong in the database, return a promise.
var findBatchInfo = Promise.method(function(batch) {
  var lcOwner = batch._id;

  var uniqueOwners = _.uniq(batch.rooms.map(function(room) {
    return room.uri.split('/')[0];
  }));

  var githubTypeMap = {};
  batch.rooms.forEach(function(room) {
    githubTypeMap[room.githubType] = true;
  });
  var githubTypes = Object.keys(githubTypeMap);

  var type = 'unknown';
  var errors = [];

  return Promise.join(
    findGitHubOrg(lcOwner),
    findGitHubUser(lcOwner),
    function(org, user) {
      if (org) {
        type = 'org';

        // if they aren't all this org, update them
        if (!_.every(uniqueOwners, org.uri)) {
          errors.push({
            type: "owner",
            lcOwner: lcOwner,
            correctOwner: org.uri,
            batch: batch
          });
        }

      } else if (user) {
        type = 'user';

        // if they aren't all this user, update them
        if (!_.every(uniqueOwners, user.uri)) {
          errors.push({
            type: "owner",
            lcOwner: lcOwner,
            correctOwner: user.uri,
            batch: batch
          });
        }

      } else {

        // TODO: if type is unknown and there are ownerUserIds, try and look
        // them up in the user dump. Possible that the username has changed.
        // (just be aware that some batches have multiple github user ids..)

        // TODO: If we still really don't know, we can try and look up the repo
        // by github ids via their API and then get the info from there. The
        // org or username could have been completely renamed. It could also be
        // a private repo, though.

        // Whatever we do, we have to do something manually here if we still
        // can't figure it out, so log this loudly.
      }

      console.log(lcOwner, type);


      // NOTE: The rest of the problems we just log. Not going to automatically fix
      // them as they are so rare. But if we find more that are worth automatically
      // fixing we could add different types of errors.
      logBatchWarnings(batch, githubTypes);

      return {
        type: type,
        errors: errors,
        githubTypes: githubTypes
      };
    });
});

// promise wrapping a stream that will return the things that are wrong that we
// can try and fix automatically
function getErrors() {
  return new Promise(function(resolve, reject) {
    var numOrgs = 0;
    var numUsers = 0;
    var numBatches = 0;
    var numOrgErrors = 0;
    var numUserErrors = 0;
    var errors = [];
    var unknown = [];
    getBatchedRooms()
      .pipe(through2Concurrent.obj({ maxConcurrency: 10 },
      function(batch, enc, callback) {
        numBatches++;
        findBatchInfo(batch)
          .then(function(info) {
            if (info.type == 'org') {
              numOrgs++;
            }
            if (info.type == 'user') {
              numUsers++;
            }
            if (info.type == 'unknown') {
              unknown.push([batch._id, info.githubTypes]);
            }
            if (info.errors.length) {
              if (info.type == 'org') {
                numOrgErrors++;
              }
              if (info.type == 'user') {
                numUserErrors++;
              }
              Array.prototype.push.apply(errors, info.errors);
              //console.log(batch._id, info);
              callback();
            } else {
              callback();
            }
          });
      }))
      .on('data', function(batch) {
      })
      .on('end', function() {
        console.log(numBatches, "batches processed");
        console.log(errors.length, "batches with possible errors");
        console.log(numOrgErrors, "org batches with possible errors");
        console.log(numUserErrors, "user batches with possible errors");
        console.log(numOrgs, "orgs");
        console.log(numUsers, "users");
        console.log(unknown.length, "unknown");
        console.log("NOTE: room uris could still be wrong in other parts and this script doesn't double-check all users.")
        resolve(errors);
      })
      .on('error', function(error) {
        reject(error);
      });
  });
}

/*
Take an array of possible ways to spell an owner (probabably only differing in
case), return a promise that will resolve to ownerInfo:
ownerInfo could be null if we can't find it.
ownerInfo.type == 'user' or 'org'
ownerInfo.uri == the correct username or org name

It only returns the first one it finds, because finding multiple different ones
and trying to deal with that just does my head in.
*/
/*
var findOwner = Promise.method(function(lcOwner, uniqueOwners) {
  // this will only return the first one that matches

  // synchronously:
  // 1. check known orgs
  var org = _.find(uniqueOwners, function(o) {
    return !!orgMap[o];
  });
  if (org) {
    return {
      type: 'org',
      uri: org
    };
  }

  // 2. check known usernames
  var user = _.find(uniqueOwners, function(o) {
    return !!userMap[o];
  });
  if (user) {
    return {
      type: 'user',
      uri: user
    };
  }

  // asynchronously:
  // 1. check github users via API
  // 2. check github orgs via API
  // NOTE: the github api is case-insensitive in terms of the uris, but will
  // return the correct case in the login variable, so we return that. Also,
  // orgs are users too, so in the org case you get both orgIngo AND userInfo.
  return Promise.join(
    tentacles.org.get(lcOwner),
    tentacles.user.get(lcOwner),
    function(orgInfo, userInfo) {
      // could be nice if we cache the results so we don't have to look them up
      // again after the dry run
      if (orgInfo) {
        return {
          type: 'org',
          uri: orgInfo.login
        };
      } else if (userInfo) {
        return {
          type: 'user',
          uri: userInfo.login
        };
      } else {
        // not found
        return null;
      }
    }
  );
});
*/

var findUpdatesForOwnerError = Promise.method(function(error) {
  // check all the room uris and all the rooms with incorrect uris have to
  // be updated. also add a redirect.
  var updates = []

  error.batch.rooms.forEach(function(room) {
    // 1, 2 or 3 parts
    var parts = room.uri.split('/');
    parts[0] = error.correctOwner;
    var correctUri = parts.join('/');

    if (room.uri == correctUri) {
      // this one is correct
      return;
    }

    var update = {
      _id: room._id,
      oldUri: room.uri,
      newUri: correctUri,
      newLcUri: correctUri.toLowerCase()
    };

    console.log(JSON.stringify(update));

    updates.push(update);
  });

  return updates;
});

// asynchronously figure out how to fix the errors and return a promise with
// updates
function errorsToUpdates(errors) {
  return Promise.map(errors, function(error) {
      // return an array of objects representing updates. could be empty.
      if (error.type == 'owner') {
        return findUpdatesForOwnerError(error);

      } else {
        return Promise.resolve([]);
      }
    })
    .then(function(arrays) {
      // each error could expand into 0, 1 or n updates, so join then all into
      // one array
      return [].concat.apply([], arrays);
    });
}

// asynchronously perform database updates and return a promise
function performUpdates(updates) {
  // TODO
  console.log("TODO");
  return Promise.resolve();
}

function die(error) {
  console.error(error);
  console.error(error.stack);
  process.exit(1);
}

onMongoConnect()
  .then(function() {
    require('yargs')
      .command('dry-run', 'Dry run', { }, function() {
        //run(log, done);
        return getErrors()
          .then(function(errors) {
            console.log("finding fixes for", errors.length, "errors.");
            return errorsToUpdates(errors);
          })
          .then(function(updates) {
            console.log(updates.length, "updates have to be performed.");
            shutdown.shutdownGracefully();
          })
          .catch(die);
      })
      .command('execute', 'Execute', { }, function() {
        return getErrors()
          .then(function(errors) {
            console.log("finding fixes for", errors.length, "errors.");
            return errorsToUpdates(errors);
          })
          .then(function(updates) {
            console.log("performing", updates.length, "updates");
            return performUpdates(updates);
          })
          .then(function() {
            shutdown.shutdownGracefully();
          })
          .catch(die);
      })
      .demand(1)
      .strict()
      .help('help')
      .alias('help', 'h')
      .argv;
  });

