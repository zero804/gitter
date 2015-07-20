#!/usr/bin/env node

/* jshint node:true, unused:true */
"use strict";

var shutdown = require('shutdown');
var persistence = require('../../server/services/persistence-service');
var uriLookupService   = require("../../server/services/uri-lookup-service");

var readline = require('readline');
var Q = require('q');

var qlimit = require('qlimit');
var limit = qlimit(1);

require('../../server/utils/event-listeners').installLocalEventListeners();

var opts = require("nomnom")
   .option('old', {
      abbr: 'o',
      required: true,
      help: 'Old uri for the organisation'
   })
   .option('new', {
      abbr: 'n',
      required: true,
      help: 'New uri for the organisation'
   })
   .parse();

var lcOld = opts.old.toLowerCase();
var lcNew = opts.new.toLowerCase();

function mapUri(oldName, oldUri, newUri) {
  if (oldName === oldUri) return newUri;
  return oldName.replace(/^[\w\-\_]+\//, newUri + '/');
}

function checkForClashes(newUris) {
  var lcNewUris = newUris.map(function(u) {
    return u.toLowerCase();
  });
  return persistence.Troupe.find({ lcUri: { $in: lcNewUris } })
    .execQ();
}

function confirm() {
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  var d = Q.defer();

  rl.question("Are you sure you want to perform these renames? Type 'yes'? ", function(answer) {
    rl.close();

    if (answer === 'yes') return d.resolve();
    d.reject(new Error('no'));
  });

  return d.promise;

}
persistence.Troupe.find({ $or: [{ lcUri: lcOld }, { lcOwner: lcOld }] })
  .execQ()
  .then(function(rooms) {
    var newUris = rooms.map(function(f) {

      return mapUri(f.uri, opts.old, opts.new);
    });

    return checkForClashes(newUris)
      .then(function(clashRooms) {
        if (clashRooms.length) {
          throw new Error("URI Clash: " + clashRooms.map(function(t) { return t.uri; }).join(','));
        }

        rooms.forEach(function(room) {
          console.log(room.uri, '->', mapUri(room.uri, opts.old, opts.new));
        });

        return confirm();
      })
      .then(function() {
        return Q.all(rooms.map(limit(function(room) {
          var newName = mapUri(room.uri, opts.old, opts.new);
          var lcNewName = newName.toLowerCase();
          var oldName = room.uri;
          var lcOldName = oldName.toLowerCase();
          room.uri = newName;
          room.lcOwner = lcNew;
          room.lcUri = lcNewName;

          if (room.lcOwner) {
            room.lcOwner = lcNew;
          }

          /* Only add if it's not a case change */
          if (lcOldName !== lcNewName) {
            room.renamedLcUris.addToSet(lcOldName);
          }
          console.log('Updating ', oldName, ' to ', newName);

          return room.saveQ()
            .then(function() {
              return uriLookupService.removeBadUri(lcOldName);
            })
            .then(function() {
              return uriLookupService.reserveUriForTroupeId(room.id, lcNewName);
            });

        })));
      });

  })

  .delay(5000)
  .then(function() {
    shutdown.shutdownGracefully();
  })
  .done();
