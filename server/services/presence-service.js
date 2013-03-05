/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var redis = require("../utils/redis"),
    winston = require('winston'),
    appEvents = require('../app-events.js'),
    _ = require("underscore"),
    redisClient;

redisClient = redis.createClient();

function defaultRedisCallback(err) {
  if(err) winston.error("presence: Redis error ", { exception: err });
}

function addUserToActiveUsers(userId, callback) {
  if(!callback) callback = defaultRedisCallback;
  redisClient.sadd("pr:activeusers", userId, function(err, count) {
    if(err) return callback(err);
    callback(null, count == 1);
  });
}

function addTroupeToActiveTroupes(troupeId, callback) {
  if(!callback) callback = defaultRedisCallback;
  redisClient.sadd("pr:activetroupes", troupeId, function(err, count) {
    if(err) return callback(err);
    callback(null, count == 1);
  });
}


function addSocketToUserSockets(userId, socketId, callback) {
  if(!callback) callback = defaultRedisCallback;
  redisClient.rpush("pr:user_sockets:" + userId, socketId, callback);
}

function addSocketToActiveSockets(socketId, callback) {
  if(!callback) callback = defaultRedisCallback;
  redisClient.sadd("pr:activesockets", socketId, callback);
}

function addUserToTroupe(userId, troupeId, callback) {
  if(!callback) callback = defaultRedisCallback;

  redisClient.lrange("pr:troupe_users:" + troupeId, 0, -1, function(err, presentUsers) {
    if(err) return callback(err);

    var initialJoin = presentUsers.indexOf(userId) == -1;
    redisClient.rpush("pr:troupe_users:" + troupeId, userId, function(err/*, newLength*/) {
      if(err) return callback(err);
      callback(null, initialJoin);
    });

  });
}

function associateSocketToTroupe(socketId, troupeId, callback) {
  if(!callback) callback = defaultRedisCallback;

  redisClient.set("pr:socket_troupe:" + socketId, troupeId, callback);
}

function removeSocketFromUserSockets(socketId, userId, callback) {
  if(!callback) callback = defaultRedisCallback;

  var key = "pr:user_sockets:" + userId;

  /* Manage user presence */
  redisClient.lrem(key, 0, socketId, function(err/*, count*/) {
    if(err) return callback(err);

    redisClient.llen(key, function(err, count) {
      if(err) return callback(err);
      var lastDisconnect = count === 0;

      callback(null, lastDisconnect);
    });
  });
}

function removeUserFromActiveUsers(userId, callback) {
  if(!callback) callback = defaultRedisCallback;
  redisClient.srem("pr:activeusers", userId, callback);
}

function disassociateSocketFromTroupe(socketId, callback) {
  if(!callback) callback = defaultRedisCallback;
  redisClient.del("pr:socket_troupe:" + socketId);
}

function getTroupeAssociatedToSocket(socketId, callback) {
  if(!callback) callback = defaultRedisCallback;
  redisClient.get("pr:socket_troupe:" + socketId, callback);
}

function removeUserFromTroupe(userId, troupeId, callback) {
  if(!callback) callback = defaultRedisCallback;

  /* Remove one copy of this user from the troupe active users list */
  redisClient.lrem("pr:troupe_users:" + troupeId, 1, userId, function(err, count) {
    if(err) return callback(err);
    if(count != 1) {
      winston.warn("presence: Inconsistent state: userId " + userId + " was removed from troupe " + troupeId + " " + count + " times. Expecting once.");
    }

    /* TODO: make the troupe_users keys into SORTED SETS */
    redisClient.lrange("pr:troupe_users:" + troupeId, 0, -1, function(err, presentUsers) {
      if(err) return callback(err);
      var lastConnectionForUser = presentUsers.indexOf(userId) == -1;
      callback(null, lastConnectionForUser);
    });
  });
}

function getNumberOfUsersInTroupe(troupeId, callback) {
  if(!callback) callback = defaultRedisCallback;

  redisClient.llen("pr:troupe_users:" + troupeId, callback);
}

function removeTroupe(troupeId, callback) {
  if(!callback) callback = defaultRedisCallback;

  redisClient.del("pr:troupe_users:" + troupeId, function(err) {
    if(err) return winston.error("presence: Redis error: " + err);
  });

  redisClient.srem("pr:activetroupes", troupeId, function(err/*, count*/) {
    if(err) return winston.error("presence: Redis error: " + err);
  });

}

function removeActiveSocket(socketId, callback) {
  if(!callback) callback = defaultRedisCallback;
  redisClient.srem("pr:activesockets", socketId, callback);
}

function listOnlineUsersForTroupe(troupeId, callback) {
  if(!callback) callback = defaultRedisCallback;
  redisClient.lrange("pr:troupe_users:" + troupeId, 0, -1, callback);
}



module.exports = {
  userSocketConnected: function(userId, socketId) {
    //winston.debug("presence: userSocketConnected: ", { userId: userId, socketId: socketId });

    addUserToActiveUsers(userId, function(err, initialConnection) {
      if(initialConnection) {
        winston.info("presence: User " + userId + " connected.");
      }
    });

    addSocketToUserSockets(userId, socketId);
    addSocketToActiveSockets(socketId);
  },

  userSubscribedToTroupe: function(userId, troupeId, socketId) {
    addTroupeToActiveTroupes(troupeId, function(err, initialConnection) {
      if(initialConnection) {
        winston.info("presence: Troupe " + troupeId + " activated");
      }
    });

    addUserToTroupe(userId, troupeId, function(err, initialJoin) {
      if(initialJoin) {
        /* User joining this troupe for the first time.... */
        winston.info("presence: User " + userId + " has just joined " + troupeId);
        appEvents.userLoggedIntoTroupe(userId, troupeId);
      }
    });

    associateSocketToTroupe(socketId, troupeId);
  },

  userSocketDisconnected: function(userId, socketId) {
    winston.debug("presence: userSocketDisconnected: ", { userId: userId, socketId: socketId });

    // Give the user 10 seconds to re-login before marking them as offline
    setTimeout(function() {
      removeSocketFromUserSockets(socketId, userId, function(err, lastDisconnect) {
        if(lastDisconnect) {
          removeUserFromActiveUsers(userId);
          winston.info("presence: User " + userId + " is now offline");
        }
      });
    }, 10000);

    // But disconnect them from the troupe immediately
    getTroupeAssociatedToSocket(socketId, function(err, troupeId) {
      disassociateSocketFromTroupe(socketId);

      if(err) return winston.error("presence: Redis error: ", { exception: err });
      if(!troupeId) return; /* No associated with a troupe. Fuggitaboutit */

      removeUserFromTroupe(userId, troupeId, function(err, lastConnectionForUserInTroupe) {
        if(lastConnectionForUserInTroupe) {
          winston.info("presence: User " + userId + " is gone from " + troupeId);

          appEvents.userLoggedOutOfTroupe(userId, troupeId);

          getNumberOfUsersInTroupe(troupeId, function(err, count) {
            if(err) return winston.error("presence: Redis error: " + err);

            if(count === 0) {
              winston.info("presence: The last user has disconnected from troupe " + troupeId);
              removeTroupe(troupeId);
            }

          });
        }
      });
    });

    removeActiveSocket(socketId);
    /* Manage user in troupe presence */
    // Find out what troupe (if any) this socket is associated with
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

      var multi = redisClient.multi();
      multi.sadd(key, userIds);
      multi.sinter('pr:activeusers',key);
      multi.del(key);
      multi.exec(function(err, replies) {
        if(err) return callback(err);

        var onlineUsers = replies[1];
        var result = {};
        if(onlineUsers) onlineUsers.forEach(function(userId) {
          result[userId] = 'online';
        });

        return callback(null, result);
      });
  },

  listOnlineUsers: function(callback) {
    redisClient.smembers("pr:activeusers", callback);
  },

  // Returns the online users for the given troupes
  // The callback function returns a hash
  // result[troupeId] = [userIds]
  listOnlineUsersForTroupes: function(troupeIds, callback) {
    troupeIds = _.uniq(troupeIds);

    var multi = redisClient.multi();

    troupeIds.forEach(function(troupeId) {
      multi.lrange("pr:troupe_users:" + troupeId, 0, -1);
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