#!/usr/bin/env node
/* jshint node:true, unused:true */
'use strict';

var persistence = require('gitter-web-persistence');
var onMongoConnect = require('../../server/utils/on-mongo-connect');
var legacyMigration = require('gitter-web-permissions/lib/legacy-migration');
var through2Concurrent = require('through2-concurrent');
var Promise = require('bluebird');

var opts = require('yargs')
  .help('help')
  .alias('help', 'h')
  .argv;


function getTroupeBatchedStream() {
  return persistence.Troupe
    .find({})
    .lean()
    .read('secondaryPreferred')
    .stream();
}

function dryRun() {
  return new Promise(function(resolve, reject) {
    getTroupeBatchedStream()
      .pipe(through2Concurrent.obj({ maxConcurrency: 10 }, function(troupe, enc, callback) {
        return legacyMigration.generatePermissionsForRoom(troupe)
          .then(function(result) {
            console.log(troupe, result)
          })
          .catch(function(e) {
            console.error('>>>>>>>>>>>>>>>>>')
            console.error(troupe);
            console.error(e.stack);
          })
          .asCallback(callback);
      }))
      .on('end', function() {
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
