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
      return troupeService.findByIds(troupeIds);
    }).then(function(troupes) {
      return troupes.map(function(troupe) {
        return troupe.uri;
      });
    });
}

userService.findByUsername(opts.username)
  .then(function(user) {
    return user._id;
  })
  .then(function(userId) {
    return [getBadgeCount(userId), getBadgeTroupeNames(userId)];
  })
  .spread(function(badgeNumber, troupeNames) {
    console.log('Unread badge number:', badgeNumber);
    console.log('Caused by:', troupeNames);
  })
  .fail(function(err) {
    console.error(err.stack);
  })
  .fin(function() {
    shutdown.shutdownGracefully();
  });
