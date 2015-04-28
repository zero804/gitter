/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var userService = require('./user-service');
var troupeService = require('./troupe-service');
var recentRoomService = require('./recent-room-service');
var Q = require('q');
var unreadItemService = require('./unread-item-service');


exports.removeByUsername = function(username) {
  console.log('USERNAME IS ', username);
  return userService.findByUsername(username)
    .then(function(user) {
      console.log('FOUND USER ', username);
      if(!user) return;

      var userId = user.id;

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
          user.state = 'REMOVED';
          user.email = undefined;
          user.invitedEmail = undefined;
          user.clearTokens();

          return user.saveQ();
        });

    });
};
