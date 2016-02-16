#!/usr/bin/env node

/* jshint node:true, unused:true */
"use strict";

var shutdown = require('shutdown');
var uriLookupService   = require('../../server/services/uri-lookup-service');
var roomService = require('../../server/services/room-service');
var troupeService = require('../../server/services/troupe-service');

var readline = require('readline');
var Promise = require('bluebird');

require('../../server/event-listeners').install();

var opts = require("nomnom")
   .option('from', {
      abbr: 'f',
      required: true,
      help: 'Old uri for the room'
   })
   .option('to', {
      abbr: 't',
      required: true,
      help: 'New uri for the room'
   })
   .parse();

var fromRoomInput = opts.from;
var toRoomInput = opts.to;

function confirm() {
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(function(resolve, reject) {
    rl.question('Are you sure you want to perform these redirects? ' + fromRoomInput + ' -> ' + toRoomInput + '\nType "yes"?', function(answer) {
      rl.close();

      if (answer === 'yes') return resolve();
      reject(new Error('no'));
    });
  });
}


var getMessageFromRoomResult = function(roomName, test) {
  if(!test) {
    return roomName + ' does not exist.';
  }

  return '';
};

Promise.all([
    troupeService.findByUri(fromRoomInput),
    troupeService.findByUri(toRoomInput),
  ])
  .spread(function(fromRoom, toRoom) {
    //console.log('asdf', fromRoom, toRoom);
    if(!fromRoom || !toRoom) {
      throw new Error(getMessageFromRoomResult(fromRoomInput, fromRoom) + ' ' + getMessageFromRoomResult(toRoomInput, toRoom));
    }

    return confirm()
      .then(function() {
        // Signify the redirect
        toRoom.renamedLcUris.addToSet(fromRoom.lcUri);

        // Move any `renamedLcUris` from the fromRoom to the toRoom
        // Note: This probably doesn't apply to many situations
        [].concat(fromRoom.renamedLcUris).forEach(function(renamedLcUri) {
          toRoom.renamedLcUris.addToSet(renamedLcUri);
        });
        return toRoom.save();
      })
      .then(function() {
        return uriLookupService.removeBadUri(fromRoom.lcUri);
      })
      .then(function() {
        return roomService.deleteRoom(fromRoom);
      });
  })
  .then(function() {
    console.log('DONE: Shutting down');
    shutdown.shutdownGracefully();
  })
  .done();
