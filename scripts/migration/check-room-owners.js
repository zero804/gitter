#!/usr/bin/env node
/* jshint node:true, unused:true */
'use strict';

var persistence = require('gitter-web-persistence');
var shutdown = require('shutdown');
var BatchStream = require('batch-stream');
var through2Concurrent = require('through2-concurrent');


function getGroupableRooms() {
  return persistence.Troupe.find(
      { githubType: { $nin: ['ONETOONE', 'USER_CHANNEL'] } },
      { uri: 1, lcUri: 1, lcOwner: 1 }
    )
    .read('secondaryPreferred')
    .stream()
    .pipe(new BatchStream({ size: 4096 }));
}

getGroupableRooms()
  .pipe(through2Concurrent.obj({ maxConcurrency: 10 },
  function(rooms, enc, callback) {
    console.log('.');
    rooms.forEach(function(room) {
      var lcUri = room.uri.toLowerCase();
      var lcOwner = room.uri.split('/')[0].toLowerCase();
      if (lcUri != room.lcUri || lcOwner != room.lcOwner) {
        console.log(room.uri+': ', room.lcUri, room.lcOwner);
      }
    });
    return callback();
  }))
  .on('end', function() {
    console.log('done!');
    shutdown.shutdownGracefully();
  })
  .on('error', function(err) {
    console.error(error);
    console.error(error.stack);
    shutdown.shutdownGracefully(1);
  })
  .on('data', function() {});

