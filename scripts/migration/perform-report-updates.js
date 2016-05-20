#!/usr/bin/env node
'use strict';

var fs = require('fs');
var _ = require('lodash');
var Promise = require('bluebird');
var shutdown = require('shutdown');
var persistence = require('gitter-web-persistence');
var through2 = require('through2');
var onMongoConnect = require('../../server/utils/on-mongo-connect');
var userService = require('../../server/services/user-service');
var troupeService = require('../../server/services/troupe-service');
var uriLookupService = require('../../server/services/uri-lookup-service');


function renameUser(update) {
  // NOTE: update lookup uris too, but not if it is only a case change
  console.log("USER", update.oldUsername, update.newUsername);
  return Promise.resolve();
}

function renameRoom(update) {
  // NOTE: remember to add to renamed uris for rooms, but not if it only
  // changed in case. Same thing when updating lookup uris - only when the uri
  // changed in more than just case.
  console.log("ROOM", update.oldUri, update.newUri);
  return Promise.resolve();
}

var performUpdate = Promise.method(function(update, duplicates) {
  if (update.type === 'rename-user') {
    if (duplicates.usernames[update.newUsername]) {
      console.log("SKIPPING USER", update.oldUsername);
    } else {
      return renameUser(update);
    }
  }
  if (update.type === 'rename-room') {
    if (duplicates.lcUris[update.newLcUri]) {
      console.log("SKIPPING ROOM", update.oldUri);
    } else {
      return renameRoom(update);
    }
  }
});


// asynchronously perform database updates and return a promise
function performUpdates(updates, duplicates) {
  return Promise.map(updates, function(update) {
    return performUpdate(update, duplicates);
  }, { concurrency: 3 });
}


var opts = require('yargs')
  .option('input', {
    required: true,
    description: 'where to find the json report'
  })
  .help('help')
  .alias('help', 'h')
  .argv;

function lookupUsername(username) {
  return userService.findByUsername(username);
}

function lookupRoomUris(uri) {
  return troupeService.findByUri(uri);
}

function findDuplicates(updates) {
  // It is better to just reason about and fix anything that will clash
  // manually.

  var duplicateUsernames = {};
  var duplicateLcUris = {};

  var newUsernameMap = {};
  var newLcUriMap = {};
  updates.forEach(function(update) {
    if (update.type === 'rename-user') {
      if (newUsernameMap[update.newUsername]) {
        duplicateUsernames[update.newUsername] = true;
        console.log("duplicate username", update.newUsername);
      } else {
        newUsernameMap[update.newUsername] = true;
      }
    } else if (update.type === 'rename-room') {
      if (newLcUriMap[update.newLcUri]) {
        duplicateLcUris[update.newLcUri] = true;
        console.log("duplicate lcUri", update.newLcUri);
      } else {
        newLcUriMap[update.newLcUri] = true;
      }
    }
  });

  var usernames = Object.keys(newUsernameMap);
  var lcUris = Object.keys(newLcUriMap);
  return Promise.join(
    Promise.map(usernames, lookupUsername, { concurrency: 10 }),
    Promise.map(lcUris, lookupRoomUris, { concurrency: 10 }),
    function(users, rooms) {
      users = _.filter(users);
      rooms = _.filter(rooms);
      users.forEach(function(user) {
        duplicateUsernames[user.newUsername] = true;
        console.log("duplicate username", user.username);
      });
      rooms.forEach(function(room) {
        duplicateLcUris[room.lcUri] = true;
        console.log("duplicate room", room.uri);
      });

      return {
        usernames: duplicateUsernames,
        lcUris: duplicateLcUris
      }
    }
    );
}


onMongoConnect()
  .then(function() {
    var text = fs.readFileSync(opts.input);
    var json = JSON.parse(text);
    return findDuplicates(json.updates)
      .then(function(duplicates) {
        console.log('-------------------------');
        return performUpdates(json.updates, duplicates);
      });
  })
  .then(function() {
    setTimeout(function() {
      shutdown.shutdownGracefully();
    }, 1000);
  })
  .catch(function(error) {
    console.error(error);
    console.error(error.stack);
    process.exit(1);
  });
