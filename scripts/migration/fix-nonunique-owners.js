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
var orgMap = require('./org-map.json');
var userMap = require('./user-map.json');


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

// totally synchronous function that just finds things that look wrong in the database
function findBatchErrors(batch) {
  var lcOwner = batch._id;

  var uniqueOwners = _.uniq(batch.rooms.map(function(room) {
    return room.uri.split('/')[0];
  }));

  var errors = [];

  if (uniqueOwners.length > 1) {
    // What happens here is the case-sensitive owner part of the URL (not
    // lcOwner) differs between the different rooms in the same batch. Either
    // the username was changed (assuming they are a user's rooms) or the org
    // was changed if it is an org's rooms. They can't all be right.

    // NOTE: This doesn't help much if all the unique owners are wrong (we
    // won't find the correct one later) or if they all have the same owner but
    // it is wrong now. ie there's only one room with the owner and it is
    // incorrect or there are multiple with the same owner but it has been
    // renamed or deleted since.

    //errors.push('owners');
    //console.log(lcOwner, "has multiple different ways of spelling the owner.");
    console.log(uniqueOwners);
    errors.push({
      type: "owner",
      lcOwner: lcOwner,
      uniqueOwners: uniqueOwners,
      batch: batch
    });
  }

  // NOTE: The rest of the problems we just log. Not going to automatically fix
  // them as they are so rare. But if we find more that are worth automatically
  // fixing we could add different types.

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

  return errors;
}

// promise wrapping a stream that will return the things that are wrong that we
// can try and fix automatically
function getErrors() {
  return new Promise(function(resolve, reject) {
    var errors = [];
    getBatchedRooms()
      .pipe(through2Concurrent.obj({maxConcurrency: 10},
      function(batch, enc, callback) {
        var batchErrors = findBatchErrors(batch);
        if (batchErrors.length) {
          Array.prototype.push.apply(errors, batchErrors);
          //console.log(batch._id, batchErrors);
          callback();
        } else {
          callback();
        }
      }))
      .on('data', function(batch) {
      })
      .on('end', function() {
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

function findUpdatesForOwnerError(error) {
  // figure out the correct owner (username or github org)
  return findOwner(error.lcOwner, error.uniqueOwners)
    .then(function(ownerInfo) {
      if (ownerInfo) {
        // check all the room uris and all the rooms with incorrect uris have to
        // be updated. also add a redirect.
        var updates = []
        error.batch.rooms.forEach(function(room) {
          // 1, 2 or 3 parts
          var parts = room.uri.split('/');
          parts[0] = ownerInfo.uri;
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
      } else {
        // oh-oh. none of them are correct..
        console.log("CANNOT FIND A VALID OWNER", error.uniqueOwners);
        return [];
      }
    });
}

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

/*
var totalYes = 0;
var totalMaybe = 0;
function fix(batch, enc, callback) {
  var errors = findErrors(batch);

  if (errors.length) {
    console.log(batch._id, errors);
    if (errors.indexOf('owners') !== -1) {
      var uniqueOwners = _.uniq(batch.rooms.map(function(room) {
        return room.uri.split('/')[0];
      }));
      // lookup user in userMap
      var username = _.find(uniqueOwners, function(owner) {
        return !!userMap[owner];
      });
      if (username) {
        console.log("YES", uniqueOwners, '->', username);
        totalYes++;
      } else {
        console.log("MAYBE");
        totalMaybe++;
      }
      // if we can't find it there, then look it up in GitHub
      callback()
    } else {
      callback();
    }
  } else {
    callback();
  }
}
*/

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

