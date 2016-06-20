#!/usr/bin/env node
/* jshint node:true, unused:true */
'use strict';

var persistence = require('gitter-web-persistence');
var legacyMigration = require('gitter-web-permissions/lib/legacy-migration');
var through2Concurrent = require('through2-concurrent');
var Promise = require('bluebird');
var BatchStream = require('batch-stream');
var _ = require('lodash');
var shutdown = require('shutdown');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');

function getTroupeBatchedStream() {
  return persistence.Troupe
    .find({ sd: null })
    .lean()
    .read('secondaryPreferred')
    .stream()
    .pipe(new BatchStream({ size: 8192 }));
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
      });
    });
}

function getPipeline() {
  var count = 0;
  return getTroupeBatchedStream()
    .pipe(through2Concurrent.obj({ maxConcurrency: 1 }, function(troupes, enc, callback) {
      var self = this;
      count++;
      return joinTroupesToParentsAndOwners(troupes)
        .then(function(results) {

          results.forEach(function(result) {
            try {
              var perms = legacyMigration.generatePermissionsForRoom(result.troupe, result.parent, result.ownerUser);
              self.push({ troupe: result.troupe, perms: perms });
            } catch(e) {
              self.push({ troupe: result.troupe, error: e });
            }
          });

          return null;
        })
        .then(function() {
          callback();
        },function(err) {
          callback(err);
        });
    }));

}

var updateBatch = Promise.method(function (items) {
  items = items.filter(function(item) {
    return !item.error;
  });

  if (!items.length) return;

  var bulk = persistence.Troupe.collection.initializeUnorderedBulkOp();

  items.forEach(function(item) {
    var troupeId = item.troupe._id;
    var descriptor = item.perms;

    var sd = {
      type: descriptor.type,
      members: descriptor.members,
      admins: descriptor.admins,
      public: descriptor.public,
      linkPath: descriptor.linkPath,
      externalId: descriptor.externalId,
    };

    if (descriptor.extraMembers && descriptor.extraMembers.length) {
      sd.extraMembers = mongoUtils.asObjectIDs(descriptor.extraMembers);
    }

    if (descriptor.extraAdmins && descriptor.extraAdmins.length) {
      sd.extraAdmins = mongoUtils.asObjectIDs(descriptor.extraAdmins);
    }

    var setOperation = {
      $set: {
        sd: sd
      }
    };

    bulk.find({ _id: troupeId, sd: null })
      .upsert()
      .updateOne(setOperation);
  });

  return Promise.fromCallback(function(callback) {
      bulk.execute(callback);
    })
    .then(function(x) {
      return x.nModified;
    });

});

function execute() {
  return new Promise(function(resolve, reject) {
    var count = 0;
    var totalModified = 0;
    getPipeline()
      .pipe(new BatchStream({ size: 1024 }))
      .pipe(through2Concurrent.obj({ maxConcurrency: 1 }, function(items, enc, callback) {
        console.log('updating ', items.length);
        return updateBatch(items)
          .then(function(upsertCount) {
            callback(null, upsertCount || 0);
          },function(err) {
            callback(err);
          });
      }))

      .on('error', reject)
      .on('data', function(modified) {
        count++;
        totalModified = totalModified + modified;
        if ((count % 10) === 0) {
          console.log('# ' + (count * 1024), 'modified', totalModified);
        }
      })
      .on('end', function() {
        console.log('# final' + (count * 1024), 'modified', totalModified);
        resolve();
      });

  });
}

function dryRun() {
  return new Promise(function(resolve, reject) {
    var success = 0;
    var fail = 0;
    getPipeline()
      .on('data', function(item) {
        if (item.error) {
          fail++;
          console.log(item.troupe);
          console.log(item.error.message);
          console.log('------------')
          return;
        }

        success++;
      })
      .on('end', function() {
        console.log('FAIL', fail);
        console.log('success', success);
        resolve();
      })
      .on('error', reject);
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
        shutdown.shutdownGracefully();
      })
      .done();
  })
  .demand(1)
  .strict()
  .help('help')
  .alias('help', 'h')
  .argv;
