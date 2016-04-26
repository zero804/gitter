#!/usr/bin/env node
/* jshint node:true, unused:true */
'use strict';

var persistence = require('gitter-web-persistence');
var onMongoConnect = require('../../server/utils/on-mongo-connect');
var legacyMigration = require('gitter-web-permissions/lib/legacy-migration');
var through2Concurrent = require('through2-concurrent');
var Promise = require('bluebird');
var BatchStream = require('batch-stream');
var _ = require('lodash');

var opts = require('yargs')
  .help('help')
  .alias('help', 'h')
  .argv;


function getTroupeBatchedStream() {
  return persistence.Troupe
    .find({})
    .lean()
    .read('secondaryPreferred')
    .stream()
    .pipe(new BatchStream({ size : 8192 }));
}

function keyById(results) {
  return results.reduce(function(memo, result) {
    memo[result._id] = result;
    return memo;
  }, {});
}

function hashOwners(ownerUserIds) {
  if (!ownerUserIds.length) return Promise.resolve({});
  ownerUserIds = _.uniq(ownerUserIds);

  return persistence.User.find({ _id: { $in: _.uniq(ownerUserIds) } })
    .lean()
    .exec()
    .then(function(results) {
      console.log('GOT BACK', results.length, 'USERS for', ownerUserIds.length, 'ITEMS')

      return keyById(results, '_id');
    });
}

function hashParents(parentTroupeIds) {
  if (!parentTroupeIds.length) return Promise.resolve({});
  parentTroupeIds = _.uniq(parentTroupeIds);

  return persistence.Troupe.find({ _id: { $in: _.uniq(parentTroupeIds) } })
    .lean()
    .exec()
    .then(function(results) {
      console.log('GOT BACK', results.length, 'TROUPES for', parentTroupeIds.length, 'ITEMS')
      return keyById(results, '_id');
    });
}

function joinTroupesToParentsAndOwners(troupes) {
  var ownerUserIds = _.map(troupes, 'ownerUserId').filter(function(f) { return !!f; });
  var parentTroupeIds = _.map(troupes, 'parentId').filter(function(f) { return !!f; });

  return Promise.join(
    hashOwners(ownerUserIds),
    hashParents(parentTroupeIds),
    function(ownerUsers, parentTroupes) {
      return troupes.map(function(troupe) {
        var parent, ownerUser;
        if (troupe.ownerUserId) {
          ownerUser = ownerUsers[troupe.ownerUserId];
        }
        if (troupe.parentId) {
          parent = parentTroupes[troupe.parentId];
        }
        return { troupe: troupe, ownerUser: ownerUser, parent: parent };
      })
    });
}

function dryRun() {
  return new Promise(function(resolve, reject) {
    var success = 0;
    var fail = 0;
    getTroupeBatchedStream()
      .pipe(through2Concurrent.obj({ maxConcurrency: 1 }, function(troupes, enc, callback) {
        return joinTroupesToParentsAndOwners(troupes)
          .then(function(results) {
            results.forEach(function(result) {
              try {
                var perms = legacyMigration.generatePermissionsForRoom(result.troupe, result.parent, result.ownerUser)
                // console.log(result.troupe, perms);
                success++;
              } catch(e) {
                fail++;
                console.error('>>>>>>>>>>>>>>>>>')
                console.error(result.troupe);
                console.error(e.stack);
              }
            })
          })
          .asCallback(callback);
      }))
      .on('end', function() {
        console.log('FAIL', fail);
        console.log('success', success);
        resolve();
      })
      .on('error', reject)
      .on('data', function() {});
  });
}
onMongoConnect()
  .then(function() {
    return dryRun()
  })
  .delay(1000)
  .then(function() {
    process.exit();
  })
  .catch(function(err) {
    console.error(err.stack);
    process.exit(1);
  })
  .done();
