var userService = require('../../server/services/user-service');
var troupeService = require('../../server/services/troupe-service');
var presenceService = require('../../server/services/presence-service.js');
var shutdown = require('shutdown');
var Q = require('q');

var opts = require("nomnom").option('username', {
  position: 0,
  required: true,
  help: "username to look up e.g trevorah"
}).parse();

userService.findByUsername(opts.username)
  .then(function(user) {
    return user._id;
  })
  .then(function(userId) {
    return Q.ninvoke(presenceService, 'categorizeUsersByOnlineStatus', [userId])
      .then(function(statusHash) {
        return !!statusHash[userId];
      });
  })
  .then(function(isOnline) {
    console.log(isOnline ? 'online' : 'offline');
  })
  .fail(function(err) {
    console.error(err.stack);
  })
  .fin(function() {
    shutdown.shutdownGracefully();
  });
