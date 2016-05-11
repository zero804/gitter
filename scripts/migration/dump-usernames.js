#!/usr/bin/env node
'use strict';

var _ = require('lodash');
var shutdown = require('shutdown');
var persistence = require('gitter-web-persistence');
var mongooseUtils = require('gitter-web-persistence-utils/lib/mongoose-utils');
var onMongoConnect = require('../../server/utils/on-mongo-connect');
var es = require('event-stream');


function getUsernames() {
  return persistence.User.find({}, {username: 1})
    .lean()
    .read('secondaryPreferred')
    .stream();
}

var usernameMap = {};
function run(callback) {
  getUsernames()
    .pipe(es.through(function(row) {
      usernameMap[row.username] = true;
    }))
    .on('end', function() {
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
    run(function(err) {
      if (!err) {
        console.log(JSON.stringify(usernameMap));
      }
      done(err);
    });
  });
