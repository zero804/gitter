#!/usr/bin/env node
"use strict";

var userService = require('../../server/services/user-service');
var troupeService = require('../../server/services/troupe-service');
var roomMembershipService = require('../../server/services/room-membership-service');
var suggestions = require('gitter-web-suggestions');
var shutdown = require('shutdown');
var _ = require('lodash')

var opts = require('yargs')
  .option('uri', {
    description: "uri of room to list suggestions for"
  })
  .option('username', {
    description: "username of user list suggestions for"
  })
  .help('help')
  .alias('help', 'h')
  .argv;

function getRooms() {
  var lang = opts.lang || 'en';
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
        // roomIds = roomIds.slice(0, 10);

        // NOTE: we'll only need id and lang in normal operation
        return troupeService.findByIdsLean(roomIds, {
          uri: 1,
          lang: 1,
          name: 1,
          userCount: 1,
          oneToOne: 1
        });
      });
  } else {
    throw new Error('uri or username required');
  }
}

getRooms()
  .then(function(roomsIncluding1to1s) {
    // 1to1 rooms aren't included in the graph anyway
    var rooms = _.filter(roomsIncluding1to1s, function(room) {
      return room.oneToOne != true;
    });

    // smallest first
    rooms.sort(function(a, b) {
      return a.userCount - b.userCount;
    });

    console.log("input", rooms);
    return suggestions.getSuggestionsForRooms(rooms);
  })
  .then(function(suggestions) {
    var roomIds = _.pluck(suggestions, 'roomId');
    return troupeService.findByIdsLean(roomIds, {uri: 1, name: 1});
  })
  .then(function(suggestedRooms) {
    console.log("suggestedRooms", _.pluck(suggestedRooms, 'uri'));
  })
  .catch(function(err) {
    console.error(err.stack);
    throw err;
  })
  .finally(function() {
    shutdown.shutdownGracefully();
  });
