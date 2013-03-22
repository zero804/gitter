/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var redis = require("../utils/redis"),
    winston = require('winston'),
    appEvents = require('../app-events.js'),
    _ = require("underscore"),
    Q = require('q'),
    redisClient;

redisClient = redis.createClient();

// This is called after a timeout (about 10 seconds) so that if the user has
// opened another socket, we don't send out notifications that they're offline
function removeSocketFromUserSockets(socketId, userId, callback) {
  winston.debug("presence: removeSocketFromUserSockets: ", { userId: userId, socketId: socketId });

  var key = "pr:user:" + userId;
  redisClient.srem(key, socketId, function(err, sremResult) {
    if(err) return callback(err);

    // If result != 1, it means that this operation has already occurred somewhere else in the system
    // pr:user acts as an exclusivity-lock
    if(sremResult != 1) {
      winston.debug('Socket not in list of sockets associated with user', { key: key, userId: userId, socketId: socketId });
      return callback(null, false);
    }

    redisClient.multi()
      .scard(key)                                    // 0 Count the items in the user_sockets
      .zincrby('pr:active_u', -1, userId)            // 1 decrement the score for user in troupe_users zset
      .zremrangebyscore('pr:active_u', '-inf', '0')  // 2 remove everyone with a score of zero (no longer in the troupe)
      .exec(function(err, replies) {
        if(err) return callback(err);

        var scardResult = replies[0];
        var zincrbyResult = parseInt(replies[1], 10);

        if(zincrbyResult !== scardResult) {
          winston.warn('Inconsistency between pr:active_u and ' + key + '. Values are ' + zincrbyResult + ' and ' + scardResult);
        }

        callback(null, scardResult === 0);
      });

  });
}

function removeUserFromTroupe(socketId, userId) {
  redisClient.multi()
    .get("pr:socket_troupe:" + socketId)    // 0 Find the troupe associated with the socket
    .del("pr:socket_troupe:" + socketId)    // 1 Delete the socket troupe association
    .exec(function(err, replies) {
      if(err) {
        winston.error('Error while removing user from troupe', { exception: err });
        return;
      }
      var troupeId = replies[0];

      if(!troupeId) {
        // This is the case for TroupeNotifier and iOS app
        return;
      }

      var key = 'pr:tr_u:' + troupeId;
      redisClient.multi()
        .zincrby(key, -1, userId)            // 0 decrement the score for user in troupe_users zset
        .zremrangebyscore(key, '-inf', '0')  // 1 remove everyone with a score of zero (no longer in the troupe)
        .zcard(key)                          // 2 count the number of users left in the set
        .exec(function(err, replies) {
          if(err) {
            winston.error('Error while removing user from troupe', { exception: err });
            return;
          }

          var userHasLeftTroupe = parseInt(replies[0], 10) <= 0;
          var troupeIsEmpty = replies[2] === 0;

          if(troupeIsEmpty && !userHasLeftTroupe) {
            winston.warn("Troupe is empty, yet user has not left troupe. Something is fishy.", { troupeId: troupeId, socketId: socketId, userId: userId });
          }

          if(userHasLeftTroupe) {
            winston.info("presence: User " + userId + " is gone from " + troupeId);

            appEvents.userLoggedOutOfTroupe(userId, troupeId);

            if(troupeIsEmpty) {
              winston.info("presence: The last user has disconnected from troupe " + troupeId);
            }
          }

        });

    });


}

function listOnlineUsersForTroupe(troupeId, callback) {
  redisClient.zrangebyscore("pr:tr_u:" + troupeId, 1, '+inf', callback);
}

function userSocketDisconnected(userId, socketId, callback) {
  winston.debug("presence: userSocketDisconnected: ", { userId: userId, socketId: socketId });

  // Give the user 10 seconds to re-login before marking them as offline
  setTimeout(function() {
    removeSocketFromUserSockets(socketId, userId, function(err, lastDisconnect) {
      if(err) {
        winston.info("presence: removeSocketFromUserSockets " + socketId + "," + userId + " failed: ", err);
        if(callback) callback();
        return;
      }

      if(lastDisconnect) {
        winston.info("presence: User " + userId + " is now offline");
      }

      if(callback) callback();

    });
  }, 10000);

}

module.exports = {
  userSocketConnected: function(userId, socketId, callback) {
    winston.info("presence: Socket connected: " + socketId + ". User=" + userId);

    var userKey = "pr:user:" + userId;
    // Associate socket with user
    redisClient.sadd(userKey, socketId, function(err, saddResult) {
      if(err) return callback(err);

      // If the socket was not added (as it's ready there) then this isn't the first time this
      // operation is being performed, so don't continue. We're using redis as an exclusivity lock
      if(saddResult != 1) return callback();

      redisClient.multi()
        .set("pr:socket:" + socketId, userId)           // 0 Associate user with socket
        .scard(userKey)                                 // 1 Count the number of sockets for this user
        .zincrby('pr:active_u', 1, userId)              // 2 Add user to active users
        .sadd("pr:activesockets", socketId, callback)   // 3 Add socket to list of active sockets
        .exec(function(err, replies) {
          var scardResult = replies[1];
          var zincrbyResult = parseInt(replies[2], 10);
          var sadd2Result = replies[3];

          if(scardResult !== zincrbyResult) {
            winston.warn("presence: User socket cardinality is " + scardResult +
                          ", active_u score is " + zincrbyResult +
                          ". Something strange is happening.", { userId: userId, socketId: socketId });
          }

          if(zincrbyResult == 1) {
            winston.info("presence: User " + userId + " connected.");
          }

          if(sadd2Result != 1) {
           winston.warn("presence: Socket has already been added to the activesockets list " +
                          ". Something strange is happening.", { userId: userId, socketId: socketId });
          }

          callback(err);

        });
    });



  },

  userSubscribedToTroupe: function(userId, troupeId, socketId) {
    // Associate socket with troupe
    redisClient.setnx("pr:socket_troupe:" + socketId, troupeId, function(err, result) {
      if(err) return;
      if(!result) return;

      // increment the score for user in troupe_users zset
      redisClient.zincrby('pr:tr_u:' + troupeId, 1, userId, function(err, reply) {
          var userScore = parseInt(reply, 10);                   // Score for user
          if(userScore == 1) {
            /* User joining this troupe for the first time.... */
            winston.info("presence: User " + userId + " has just joined " + troupeId);
            appEvents.userLoggedIntoTroupe(userId, troupeId);
          }
        });

    });

  },

  // Called when a socket is disconnected
  socketDisconnected: function(socketId, callback) {
    if(!callback) callback = function() {};

    winston.info("presence: Socket disconnected: " + socketId);

    // Disassociates the socket with user, the user with the socket, deletes the socket
    // returns the userId in the callback
    redisClient.multi()
      .get("pr:socket:" + socketId)           // 0 Find the user for the socket
      .del("pr:socket:" + socketId)           // 1 Remove the socket user association
      .srem("pr:activesockets", socketId)     // 2 remove the socket from active sockets
      .exec(function(err, replies) {
        if(err) { winston.error("presence: Error disconnecting socket", { exception:  err }); return callback(err); }

        var userId = replies[0];

        if(!userId) {
          winston.info("presence: Socket did not appear to be associated with a user: " + socketId);
          return;
        }

        userSocketDisconnected(userId, socketId);
        removeUserFromTroupe(socketId, userId);

        callback();
      });
  },

  validateActiveSockets: function(engine, callback) {
    if(!callback) callback = function() {};
    winston.debug('presence: Commencing validation.');

    redisClient.smembers("pr:activesockets", function(err, sockets) {
      if(!sockets.length) {
        winston.debug('presence: Validation: No active sockets.');
        return callback();
      }

      winston.info('presence: Validating ' + sockets.length + ' active sockets');

      sockets.forEach(function(socketId) {
        var d = Q.defer();
        var promises = [];
        promises.push(d.promise);

        engine.clientExists(socketId, function(exists) {
          if(!exists) {
            winston.debug('Disconnecting invalid socket ' + socketId);
            module.exports.socketDisconnected(socketId, d.makeNodeResolver());
          } else {
            winston.debug('Socket still appears to be valid:' + socketId);
            d.resolve();
          }

        });

      });
    });
  },

  lookupUserIdForSocket: function(socketId, callback) {
    redisClient.get("pr:socket:" + socketId, callback);
  },

  findOnlineUsersForTroupe: function(troupeId, callback) {
    listOnlineUsersForTroupe(troupeId, callback);
  },

  // Given an array of usersIds, returns a hash with the status of each user. If the user is no in the hash
  // it implies that they're offline
  // callback(err, status)
  // with status[userId] = 'online' / <missing>
  categorizeUsersByOnlineStatus: function(userIds, callback) {
      var t = process.hrtime();
      var key = "pr:presence_temp_set:" + process.pid + ":" + t[0] + ":" + t[1];
      var out_key = "pr:presence_temp_set:" + process.pid + ":" + t[0] + ":" + t[1] + '_out';

      var zaddArgs = [key];
      userIds.forEach(function(id) {
        zaddArgs.push(0, id);
      });

      redisClient.multi()
        .zadd(zaddArgs)                                 // 0 create zset of users
        .zinterstore(out_key, 2, 'pr:active_u',key)  // 1 intersect with online users
        .zrangebyscore(out_key, 1, '+inf')              // 2 return all online users
        .del(key, out_key)                              // 3 delete the keys
        .exec(function(err, replies) {
          if(err) return callback(err);

          var onlineUsers = replies[2];
          var result = {};
          if(onlineUsers) onlineUsers.forEach(function(userId) {
            result[userId] = 'online';
          });

          return callback(null, result);
        });
  },

  listOnlineUsers: function(callback) {
    redisClient.zrange("pr:active_u", 0, -1, callback);
  },

  // Returns the online users for the given troupes
  // The callback function returns a hash
  // result[troupeId] = [userIds]
  listOnlineUsersForTroupes: function(troupeIds, callback) {
    troupeIds = _.uniq(troupeIds);

    var multi = redisClient.multi();

    troupeIds.forEach(function(troupeId) {
      multi.zrangebyscore("pr:tr_u:" + troupeId, 1, '+inf');
    });

    multi.exec(function(err, replies) {
      if(err) return callback(err);

      var result = {};
      troupeIds.forEach(function(troupeId, index) {
        var onlineUsers = replies[index];

        result[troupeId] = onlineUsers;
      });

      return callback(null, result);
    });

  }


};