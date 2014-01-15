/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var Q             = require('q');
var userService   = require('./user-service');
var troupeService = require('./troupe-service');
var lazy          = require('lazy.js');

function generateRoomListForUser(userId) {
  return Q.all([
      troupeService.findFavouriteTroupesForUser(userId),
      userService.getTroupeLastAccessTimesForUser(userId)
    ])
    .spread(function(favourites, lats) {
      var sortedRooms = lazy(favourites)
                              .pairs()
                              .sortBy(function(a) { return isNaN(a[1]) ? 1000 : a[1]; }) // XXX: ? operation no longer needed
                              .pluck(function(a) { return a[0]; });

      var recentTroupeIds = lazy(lats)
                              .pairs()
                              .sortBy(function(a) { return a[1]; }) // Sort on the date
                              .reverse()                            // Reverse the sort (desc)
                              .first(5)                             // Only pick 5
                              .pluck(function(a) { return a[0]; })  // Pick the troupeId
                              .without(sortedRooms);                // Remove any favourites

      var troupeIds = sortedRooms
                              .concat(recentTroupeIds); // Add recents

      var positions = troupeIds
                              .map(function(v, i) {
                                return [v, i];
                              })
                              .toObject();

      return [troupeService.findByIds(troupeIds.toArray()), positions];
    })
    .spread(function(rooms, positions) {
      var sorted = lazy(rooms)
                .sortBy(function(room) { return positions[room.id]; })
                .toArray();

      return sorted;
    });

}

exports.generateRoomListForUser = generateRoomListForUser;
