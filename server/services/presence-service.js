/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true */
"use strict";

var redis = require("redis"),
    winston = require('../utils/winston'),
    appEvents = require('../app-events.js'),
    redisClient;

function resetClientState() {
  function clearState(collection, item, name) {
    redisClient.smembers(collection, function(err, members) {
      if(err) return winston.error("Redis error: " + err);

      if(members.length) {
        var keysToDelete = members.map(function(userId) { return item + ":" + userId });
        keysToDelete.push(collection);

        redisClient.del(keysToDelete, function(err, count) {
          winston.info("Removed " + (count - 1) + " stale " + name + "(s).");
        });
      }
    });
  }

  clearState("presence:activeusers", "user_sockets", "user");
  clearState("presence:activetroupes", "troupe_users", "troupe");
  clearState("presence:activesockets", "socket_troupe", "socket");
}


winston.info("Presence service establishing redis client");
/* TODO: shutdown client at end of session */
redisClient = redis.createClient();

function defaultRedisCallback(err) {
  if(err) winston.error("Redis error: " + err);
}

function addUserToActiveUsers(userId, callback) {
  if(!callback) callback = defaultRedisCallback;
  redisClient.sadd("presence:activeusers", userId, function(err, count) {
    if(err) return callback(err);
    callback(null, count == 1);
  });
}

function addTroupeToActiveTroupes(troupeId, callback) {
  if(!callback) callback = defaultRedisCallback;
  redisClient.sadd("presence:activetroupes", troupeId, function(err, count) {
    if(err) return callback(err);
    callback(null, count == 1);
  });
}


function addSocketToUserSockets(userId, socketId, callback) {
  if(!callback) callback = defaultRedisCallback;
  redisClient.rpush("user_sockets:" + userId, socketId, callback);
}

function addSocketToActiveSockets(socketId, callback) {
  if(!callback) callback = defaultRedisCallback;
  redisClient.sadd("presence:activesockets", socketId, callback);
}

function addUserToTroupe(userId, troupeId, callback) {
  if(!callback) callback = defaultRedisCallback;

  redisClient.lrange("troupe_users:" + troupeId, 0, -1, function(err, presentUsers) {
    if(err) return callback(err);

    var initialJoin = presentUsers.indexOf(userId) == -1;
    redisClient.rpush("troupe_users:" + troupeId, userId, function(err, newLength) {
      if(err) return callback(err);
      callback(null, initialJoin);
    });

  });
}

function associateSocketToTroupe(socketId, troupeId, callback) {
  if(!callback) callback = defaultRedisCallback;

  redisClient.set("socket_troupe:" + socketId, troupeId, callback);
}

function removeSocketFromUserSockets(socketId, userId, callback) {
  if(!callback) callback = defaultRedisCallback;

  var key = "user_sockets:" + userId;

  /* Manage user presence */
  redisClient.lrem(key, 0, socketId, function(err, count) {
    if(err) return callback(err);

    redisClient.llen(key, function(err, count) {
      if(err) return callback(err);
      var lastDisconnect = count == 0;

      callback(null, lastDisconnect);
    });
  });
}

function removeUserFromActiveUsers(userId, callback) {
  if(!callback) callback = defaultRedisCallback;
  redisClient.srem("presence:activeusers", userId, callback);
}

function disassociateSocketFromTroupe(socketId, callback) {
  if(!callback) callback = defaultRedisCallback;
  redisClient.del("socket_troupe:" + socketId);
}

function getTroupeAssociatedToSocket(socketId, callback) {
  if(!callback) callback = defaultRedisCallback;
  redisClient.get("socket_troupe:" + socketId, callback);
}

function removeUserFromTroupe(userId, troupeId, callback) {
  if(!callback) callback = defaultRedisCallback;

  /* Remove one copy of this user from the troupe active users list */
  redisClient.lrem("troupe_users:" + troupeId, 1, userId, function(err, count) {
    if(err) return callback(err);
    if(count != 1) {
      winston.warn("Inconsistent state: userId " + userId + " was removed from troupe " + troupeId + " " + count + " times. Expecting once.");
    }

    /* TODO: make the troupe_users keys into SORTED SETS */
    redisClient.lrange("troupe_users:" + troupeId, 0, -1, function(err, presentUsers) {
      if(err) return callback(err);
      var lastConnectionForUser = presentUsers.indexOf(userId) == -1;
      callback(null, lastConnectionForUser);
    });
  });
}

function getNumberOfUsersInTroupe(troupeId, callback) {
  if(!callback) callback = defaultRedisCallback;

  redisClient.llen("troupe_users:" + troupeId, callback);
}

function removeTroupe(troupeId, callback) {
  if(!callback) callback = defaultRedisCallback;

  redisClient.del("troupe_users:" + troupeId, function(err) {
    if(err) return winston.error("Redis error: " + err);
  });

  redisClient.srem("presence:activetroupes", troupeId, function(err, count) {
    if(err) return winston.error("Redis error: " + err);
  });

}

function removeActiveSocket(socketId, callback) {
  if(!callback) callback = defaultRedisCallback;
  redisClient.srem("presence:activesockets", socketId, callback);
}

function listOnlineUsersForTroupe(troupeId, callback) {
  if(!callback) callback = defaultRedisCallback;
  redisClient.lrange("troupe_users:" + troupeId, 0, -1, callback);
}

resetClientState();

module.exports = {
  userSocketConnected: function(userId, socketId) {
    addUserToActiveUsers(userId, function(err, initialConnection) {
      if(initialConnection) {
        winston.info("User " + userId + " connected.");
      }
    });

    addSocketToUserSockets(userId, socketId);
    addSocketToActiveSockets(socketId);
  },

  userSubscribedToTroupe: function(userId, troupeId, socketId) {
    addTroupeToActiveTroupes(troupeId, function(err, initialConnection) {
      if(initialConnection) {
        winston.info("Troupe " + troupeId + " activated");
      }
    });

    addUserToTroupe(userId, troupeId, function(err, initialJoin) {
      if(initialJoin) {
        /* User joining this troupe for the first time.... */
        winston.info("User " + userId + " has just joined " + troupeId);
        appEvents.userLoggedIntoTroupe(userId, troupeId);
      }
    });

    associateSocketToTroupe(socketId, troupeId);
  },

  userSocketDisconnected: function(userId, socketId) {
    removeSocketFromUserSockets(socketId, userId, function(err, lastDisconnect) {
      if(lastDisconnect) {
        removeUserFromActiveUsers(userId);
        winston.info("User " + userId + " is now offline");
      }
    });

    getTroupeAssociatedToSocket(socketId, function(err, troupeId) {
      disassociateSocketFromTroupe(socketId);

      if(err) return winston.error("Redis error: " + err);
      if(!troupeId) return; /* No associated with a troupe. Fuggitaboutit */

      removeUserFromTroupe(userId, troupeId, function(err, lastConnectionForUserInTroupe) {
        if(lastConnectionForUserInTroupe) {
          winston.info("User " + userId + " is gone from " + troupeId);

          appEvents.userLoggedOutOfTroupe(userId, troupeId);

          getNumberOfUsersInTroupe(troupeId, function(err, count) {
            if(err) return winston.error("Redis error: " + err);

            if(count === 0) {
              winston.info("The last user has disconnected from troupe " + troupeId);
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
  }


};