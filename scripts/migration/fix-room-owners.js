#!/usr/bin/env node
'use strict';
/*eslint complexity: ["error", 30]*/

var fs = require('fs');
var _ = require('lodash');
var Promise = require('bluebird');
var shutdown = require('shutdown');
var mongoose = require('mongoose');
var persistence = require('gitter-web-persistence');
var installMigrationSchemas = require('./migration-schemas').install;
var onMongoConnect = require('../../server/utils/on-mongo-connect');
var userService = require('../../server/services/user-service');
var through2Concurrent = require('through2-concurrent');

var migrationSchemas;


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
          githubId: 1,
          ownerUserId: 1,
          userCount: 1,
          security: 1
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
    .exec()
    .stream();
}

function findBatchWarnings(opts) {
  var batch = opts.batch;
  var githubTypes = opts.githubTypes;
  var org = opts.org;
  var user = opts.user;
  var uniqueUserIds = opts.uniqueUserIds;
  var uniqueOwners = opts.uniqueOwners;

  var lcOwner = batch._id;
  var warnings = [];

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
    warnings.push(lcOwner + " has parentIds that aren't included in the batch.");
  }

  // only one unique, non-null, non-undefined ownerUserId is allowed per batch
  var ownerUserIds = Object.keys(ownerUserIdMap);
  if (ownerUserIds.length > 1) {
    // this is very rare and we'll have to just fix it manually
    warnings.push(lcOwner + " has more than one ownerUserId.");
  }

  // if an lcOwner has both an ORG_CHANNEL or ORG room _and_ a USER_CHANNEL,
  // then that's clearly wrong.
  var githubTypeMap = {};
  batch.rooms.forEach(function(room) {
    githubTypeMap[room.githubType] = true;
  });
  if ((githubTypeMap['ORG_CHANNEL'] || githubTypeMap['ORG']) && githubTypeMap['USER_CHANNEL']) {
    // this is very rare and we'll have to just fix it manually
    warnings.push(lcOwner + " has both org rooms or channels AND user channels.");
  }

  // warn if user id doesn't match all the ownerUserIds
  if (user) {
    if (!_.every(ownerUserIds, function(ownerId) { return ownerId == user.id })) {
      warnings.push(lcOwner + " has ownerUserIds that don't match the owner user's id.");
    }
  }

  return warnings;
}

function findGitHubOrg(lcUri) {
  return migrationSchemas.GitHubOrg.findOne({ lcUri: lcUri })
    .read('secondaryPreferred')
    .lean()
    .exec();
}

function findGitHubUser(lcUri) {
  return migrationSchemas.GitHubUser.findOne({ lcUri: lcUri })
    .read('secondaryPreferred')
    .lean()
    .exec();
}

var findRoomGitHubUser = Promise.method(function(ownerUserId) {
  if (ownerUserId) {
    return userService.findById(ownerUserId)
      .then(function(gitterUser) {
        if (gitterUser) {
          return migrationSchemas.GitHubUser.findOne({ githubId: gitterUser.githubId })
            .read('secondaryPreferred')
            .lean()
            .exec()
            .then(function(githubUser) {
              if (githubUser) {
                return {
                  gitterUser: gitterUser,
                  githubUser: githubUser
                };
              } else {
                return null;
              }
            });
        } else {
          return null;
        }
      });
  } else {
    return null;
  }
});


var numProcessed = 0;

// Try and find things wrong in the database, return a promise.
var findBatchInfo = Promise.method(function(batch) {
  numProcessed++;

  var lcOwner = batch._id;

  var uniqueOwners = _.uniq(batch.rooms.map(function(room) {
    return room.uri.split('/')[0];
  }));

  var githubTypeMap = {};
  batch.rooms.forEach(function(room) {
    githubTypeMap[room.githubType] = true;
  });
  var githubTypes = Object.keys(githubTypeMap);

  var uniqueUserIds = _.uniq(batch.rooms.map(function(room) {
    return room.ownerUserId;
  }));

  var type = 'unknown';
  var reason = 'unknown';
  var errors = [];

  var lookups = {};

  return Promise.join(
    // there used to be more here :)
    findRoomGitHubUser(uniqueUserIds[0]), // could be undefined
    function(roomUsers) {
      var org = batch.githuborg[0]; // could be undefined
      var user = batch.githubuser[0]; // could be undefined
      if (org) {
        type = 'org';
        reason = 'org-lookup';

        // if they aren't all this org, update them
        if (!_.every(uniqueOwners, function(uniqueUri) { return uniqueUri == org.uri; })) {
          errors.push({
            errorType: "owner",
            type: type,
            lcOwner: lcOwner,
            correctOwner: org.uri,
            batch: batch,
            org: org
          });
        }

      } else if (user) {
        type = 'user';
        reason = 'user-lookup';

        // if they aren't all this user, update them
        if (!_.every(uniqueOwners, function(uniqueUri) { return uniqueUri == user.uri; })) {
          var oldUser;
          if (roomUsers && roomUsers.gitterUser) {
            // If at least one of the rooms already belonged to a user that
            // still exists we would find it here.
            // HOWEVER, we better double check that the uri actually found the
            // same github user, otherwise we'll rename the wrong person.
            if (roomUsers.gitterUser.githubId == user.githubId) {
              oldUser = roomUsers.gitterUser;
            }
          }
          errors.push({
            errorType: "owner",
            type: type,
            lcOwner: lcOwner,
            correctOwner: user.uri,
            batch: batch,
            oldUser: oldUser, // could be undefined
            user: user
          });
        }

      } else if (roomUsers) {
        type = 'user';
        reason = 'owneruserid-lookup';

        // NOTE: does this mean we should rename the user too?

        // the user has definitely been renamed
        errors.push({
          errorType: "owner",
          type: type,
          lcOwner: lcOwner,
          correctOwner: roomUsers.githubUser.uri,
          batch: batch,
          oldUser: roomUsers.gitterUser,
          user: roomUsers.githubUser
        });

      } else {
        // TODO: incorporate the "probably" checks?
        // if we still can't figure it out, then try to look up the repo if it
        // is public?
      }

      if (user) {
        // does this user exist in our system?
        lookups.gitterUser = userService.findByGithubId(user.githubId);
      }

      return Promise.props(lookups)
        .then(function(results) {
          console.log(numProcessed, lcOwner, type);

          return errorsToUpdates(errors)
            .then(function(updates) {
              if (updates.length) {
                console.log(updates);
              }
              var data = {
                type: type,
                reason: reason,
                updates: updates,
                org: org,
                user: user,
                githubTypeMap: githubTypeMap,
                warnings: findBatchWarnings({
                  batch: batch,
                  githubTypes: githubTypes,
                  githubTypeMap: githubTypeMap,
                  uniqueUserIds: uniqueUserIds,
                  uniqueOwners: uniqueOwners,
                  org: org,
                  user: user
                })
              };

              if (lookups.gitterUser) {
                data.hasGitterUser = !!results.gitterUser;
              }

              return data;
            });
        });
    });
});

// promise wrapping a stream that will return the things that are wrong that we
// can try and fix automatically
function getInfo() {
  return new Promise(function(resolve, reject) {
    var numBatches = 0;
    var numOrgs = 0;
    var numUsers = 0;
    var numUnknown = 0;
    var numOrgUpdates = 0;
    var numUserUpdates = 0;
    var numWarnings = 0;
    var numOrgMultiple = 0;
    var numUserMultiple = 0;
    var numMissingUsers = 0;
    var updates = [];
    var warnings = [];
    var unknown = [];

    getBatchedRooms()
      .pipe(through2Concurrent.obj({ maxConcurrency: 10 },
      function(batch, enc, callback) {
        numBatches++;
        findBatchInfo(batch)
          .then(function(info) {
            if (info.type == 'org') {
              numOrgs++;
              if (batch.rooms.length > 1) {
                numOrgMultiple++;
              }
            }
            if (info.type == 'user') {
              numUsers++;
              if (batch.rooms.length > 1) {
                numUserMultiple++;
              }
              if (!info.hasGitterUser) {
                numMissingUsers++;
              }
            }
            if (info.type == 'unknown') {
              numUnknown++;
              unknown.push(batch);

              var hasOrgRoom = !!(info.githubTypeMap['ORG'] || info.githubTypeMap['ORG_CHANNEL']);
              var hasUserRoom = !!info.githubTypeMap['USER_CHANNEL'];
              var probably;
              if (hasOrgRoom) {
                probably = 'org';
              }
              if (hasUserRoom) {
                probably = 'user';
              }
              batch.rooms.forEach(function(room) {
                room.probably = probably;
              });
            }

            if (info.updates.length) {
              if (info.type == 'org') {
                numOrgUpdates += info.updates.length;
              }
              if (info.type == 'user') {
                numUserUpdates += info.updates.length;
              }
              Array.prototype.push.apply(updates, info.updates);
            }

            if (info.warnings.length) {
              numWarnings += info.warnings.length;
              Array.prototype.push.apply(warnings, info.warnings);
            }
            callback();
          });
      }))
      .on('data', function(batch) {
      })
      .on('end', function() {
        console.log('------------------------------------------')
        console.log(numBatches + ' batches processed');
        console.log(numOrgs + ' orgs');
        console.log(numUsers + ' users');
        console.log(numUnknown + ' unknown');
        console.log(numOrgUpdates + ' org updates');
        console.log(numUserUpdates + ' user updates');
        console.log(numWarnings + ' warnings');
        console.log(numOrgMultiple + ' orgs with multiple rooms.');
        console.log(numUserMultiple + ' users with multiple rooms.');
        console.log(numMissingUsers + " users haven't signed up with us.");
        console.log("NOTE: rooms could still be wrong in other parts or aspects")
        resolve({
          numBatches: numBatches,
          numOrgs: numOrgs,
          numUsers: numUsers,
          numUnknown: numUnknown,
          numOrgUpdates: numOrgUpdates,
          numUserUpdates: numUserUpdates,
          numWarnings: numWarnings,
          numOrgMultiple: numOrgMultiple,
          numUserMultiple: numUserMultiple,
          numMissingUsers: numMissingUsers,
          updates: updates,
          warnings: warnings,
          unknown: unknown
        });
      })
      .on('error', function(error) {
        reject(error);
      });
  });
}

var findUpdatesForOwnerError = Promise.method(function(error) {
  // check all the room uris and all the rooms with incorrect uris have to
  // be updated. also add a redirect.
  var updates = []

  if (error.type == 'user' && error.oldUser) {
    // double check again
    if (error.oldUser.githubId == error.user.githubId) {
      console.log('rename the user too');
      var gitterUser = error.oldUser;
      var githubUser = error.user;
      var userUpdate = {
        type: 'rename-user',
        _id: githubUser._id,
        oldUsername: gitterUser.username,
        newUsername: githubUser.uri,
      };
      console.log(JSON.stringify(userUpdate));
      updates.push(userUpdate);
    }
  }

  error.batch.rooms.forEach(function(room) {
    // 1, 2 or 3 parts
    var parts = room.uri.split('/');
    parts[0] = error.correctOwner; // error.org.uri or error.user.uri
    var correctUri = parts.join('/');

    if (room.uri == correctUri) {
      // this one is correct
      return;
    }

    var roomUpdate = {
      type: 'rename-room',
      _id: room._id,
      oldUri: room.uri,
      newUri: correctUri,
      newLcUri: correctUri.toLowerCase()
    };
    console.log(JSON.stringify(roomUpdate));
    updates.push(roomUpdate);
  });

  return updates;
});

// asynchronously figure out how to fix the errors and return a promise with
// updates
function errorsToUpdates(errors) {
  return Promise.map(errors, function(error) {
      // return an array of objects representing updates. could be empty.
      if (error.errorType == 'owner') {
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
    migrationSchemas = installMigrationSchemas(mongoose.connection);
    require('yargs')
      .command('dry-run', 'Dry run', { }, function() {
        //run(log, done);
        return getInfo()
          .then(function(report) {
            fs.writeFileSync("/tmp/owner-report.json", JSON.stringify(report));
            shutdown.shutdownGracefully();
          })
          .catch(die);
      })
      .command('execute', 'Execute', { }, function() {
        return getInfo()
          .then(function(report) {
            performUpdates(report.updates)
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

