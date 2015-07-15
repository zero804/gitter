/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var userService = require('./user-service');
var troupeService = require('./troupe-service');
var recentRoomService = require('./recent-room-service');
var Q = require('q');
var unreadItemService = require('./unread-item-service');
var debug = require('debug')('gitter:user-removal-service');

exports.removeByUsername = function(username, options) {
  return userService.findByUsername(username)
    .then(function(user) {
      debug('Remove by username %s', username);
      if(!user) return;

      var userId = user.id;

      // FIXME: NOCOMMIT
      return troupeService.findAllTroupesForUser(userId)
        .then(function(troupes) {
          return Q.all(troupes.map(function(troupe) {
            if (troupe.oneToOne) {
              return Q.all([recentRoomService.removeRecentRoomForUser(troupe.users[0].userId, troupe.id, true),
                            recentRoomService.removeRecentRoomForUser(troupe.users[1].userId, troupe.id, true),
                            troupeService.deleteTroupe(troupe)]);
            } else {
              troupe.removeUserById(userId);
              return troupe.saveQ()
                .then(function() {
                  return unreadItemService.markAllChatsRead(userId, troupe.id);
                });
            }
          }));
        })
        .then(function() {
          if (options && options.deleteUser) {
            return user.removeQ();
          }

          user.state = 'REMOVED';
          user.email = undefined;
          user.invitedEmail = undefined;
          user.clearTokens();

          return user.saveQ();

        });

    });
};
