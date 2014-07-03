var userService = require('../../server/services/user-service');
var troupeService = require('../../server/services/troupe-service');
var unreadService = require('../../server/services/unread-item-service');
var shutdown = require('shutdown');

var opts = require("nomnom").option('username', {
  position: 0,
  required: true,
  help: "username to look up e.g trevorah"
}).parse();

function getBadgeCount(userId) {
  return unreadService.getBadgeCountsForUserIds([userId])
    .then(function(badgeHash) {
      return badgeHash[userId];
    });
}

function getBadgeTroupeNames(userId) {
  return unreadService.testOnly.getTroupeIdsCausingBadgeCount(userId)
    .then(function(troupeIds) {
      return getNamesForTroupeIds(troupeIds, userId);
    });
}

function getUnreadTroupeNames(userId) {
  return unreadService.testOnly.getTroupeIdsWithUnreadChats(userId)
    .then(function(troupeIds) {
      return getNamesForTroupeIds(troupeIds, userId);
    });
}

function getNamesForTroupeIds(troupeIds, userId) {
  return troupeService.findByIds(troupeIds)
    .then(function(troupes) {
      return troupes.map(function(troupe) {
        return troupeService.getUrlForTroupeForUserId(troupe, userId);
      });
    }).all();
}

userService.findByUsername(opts.username)
  .then(function(user) {
    return user._id;
  })
  .then(function(userId) {
    return [getBadgeCount(userId), getBadgeTroupeNames(userId), getUnreadTroupeNames(userId)];
  })
  .spread(function(badgeNumber, badgeTroupeNames, unreadTroupeNames) {
    console.log('Unread badge number:', badgeNumber);
    console.log('Rooms causing badge number:', badgeTroupeNames);
    console.log('Rooms with unread messages:', unreadTroupeNames);
  })
  .fail(function(err) {
    console.error(err.stack);
  })
  .fin(function() {
    shutdown.shutdownGracefully();
  });
