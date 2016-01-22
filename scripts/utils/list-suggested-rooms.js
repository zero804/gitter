#!/usr/bin/env node
"use strict";

var userService = require('../../server/services/user-service');
var troupeService = require('../../server/services/troupe-service');
var roomMembershipService = require('../../server/services/room-membership-service');
var suggestions = require('gitter-web-suggestions');
var shutdown = require('shutdown');
var _ = require('lodash')

var opts = require("nomnom")
  .option('uri', {
    help: "uri of room to list suggestions for"
  })
  .option('username', {
    help: "username of user list suggestions for"
  })
  .parse();


function getRooms() {
  if (opts.uri) {
    return troupeService.findByUri(opts.uri)
      .then(function(room) {
        return [room];
      });
  } else if (opts.username) {
    return userService.findByUsername(opts.username)
      .then(function(user) {
        return roomMembershipService.findRoomIdsForUser(user.id);
      })
      .then(function(roomIds) {
        // cap it just in case
        roomIds = roomIds.slice(0, 10);

        // NOTE: this isn't needed in a script to just find suggestions, but
        // I'm debugging the input rooms
        return troupeService.findByIdsLean(roomIds, {uri: 1, url: 1, name: 1});
      });
  } else {
    throw new Error('uri or username required');
  }
}

getRooms()
  .then(function(rooms) {
    console.log("input", rooms);
    return suggestions.getSuggestionsForRooms(rooms);
  })
  .then(function(suggestions) {
    console.log("suggestions", suggestions);
    var roomIds = _.pluck(suggestions, 'roomId');
    return troupeService.findByIdsLean(roomIds, {uri: 1, url: 1, name: 1});
  })
  .then(function(suggestedRooms) {
    console.log("suggestedRooms", suggestedRooms);
  })
  .catch(function(err) {
    console.error(err.stack);
    throw err;
  })
  .finally(function() {
    shutdown.shutdownGracefully();
  });
