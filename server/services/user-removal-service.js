"use strict";

var userService = require('./user-service');
var troupeService = require('./troupe-service');
var roomService = require('./room-service');
var roomMembershipService = require('./room-membership-service');
var Promise = require('bluebird');
var debug = require('debug')('gitter:app:user-removal-service');

exports.removeByUsername = function(username, options) {
  return userService.findByUsername(username)
    .then(function(user) {
      debug('Remove by username %s', username);
      if(!user) return;

      var userId = user.id;

      return roomMembershipService.findRoomIdsForUser(userId)
        .then(function(troupeIds) {
          return troupeService.findByIds(troupeIds);
        })
        .then(function(troupes) {
          return Promise.all(troupes.map(function(troupe) {
            if (troupe.oneToOne) {
              return roomService.deleteRoom(troupe);
            } else {
              return roomService.removeUserFromRoom(troupe, user);
            }
          }));
        })
        .then(function() {
          if (options && options.deleteUser) {
            return user.remove();
          }

          user.state = 'REMOVED';
          user.email = undefined;
          user.invitedEmail = undefined;
          user.githubToken = null;
          user.githubScopes = { };
          user.githubUserToken = null;

          // TODO: remove user from intercom etc

          return user.save();
        });

    });
};
