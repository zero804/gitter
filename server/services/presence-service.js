/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var redis = require("../utils/redis"),
    nconf = require("../utils/config"),
    winston = require('winston'),
    appEvents = require('../app-events.js'),
    _ = require("underscore"),
    Q = require('q'),
    redisLock,
    redisClient;

redisClient = redis.createClient();
redisLock = require("redis-lock")(redis.createClient());

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
      winston.warn('Socket not in list of sockets associated with user', { key: key, userId: userId, socketId: socketId });
      return callback(null, false);
    }

    redisClient.multi()
      .zincrby('pr:active_u', -1, userId)            // 0 decrement the score for user in troupe_users zset
      .zremrangebyscore('pr:active_u', '-inf', '0')  // 1 remove everyone with a score of zero (no longer in the troupe)
      .exec(function(err, replies) {
        if(err) return callback(err);

        var zincrbyResult = parseInt(replies[0], 10);

        return callback(null, zincrbyResult === 0);
      });

  });
}

function eyeBallsOnTroupe(userId, socketId, troupeId, callback) {
  redisClient.setnx("pr:s_e:" + socketId, 1, function(err, result) {
    if(err) return callback(err);

    if(!result) return callback();

    // increment the score for user in troupe_users zset
    redisClient.zincrby('pr:tr_u:' + troupeId, 1, userId, function(err, reply) {
      if(err) return callback(err);

      var userScore = parseInt(reply, 10);                   // Score for user is returned as a string
      if(userScore == 1) {
        /* User joining this troupe for the first time.... */
        winston.info("presence: User " + userId + " has just joined " + troupeId);
        appEvents.userLoggedIntoTroupe(userId, troupeId);
      }

      return callback();
    });

  });

}

function eyeBallsOffTroupe(userId, socketId, troupeId, callback) {
  redisClient.del("pr:s_e:" + socketId, function(err, result) {
    if(err) return callback(err);

    if(!result) return callback();

    var key = 'pr:tr_u:' + troupeId;
    redisClient.multi()
      .zincrby(key, -1, userId)            // 0 decrement the score for user in troupe_users zset
      .zremrangebyscore(key, '-inf', '0')  // 1 remove everyone with a score of zero (no longer in the troupe)
      .zcard(key)                          // 2 count the number of users left in the set
      .exec(function(err, replies) {
        if(err) return callback(err);

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

        winston.debug("presence: User removed from troupe ", { troupeId: troupeId, userId: userId } );

        return callback();
      });
  });

}

function disassociateUserSocketFromTroupe(userId, socketId, callback) {
  redisClient.multi()
    .get("pr:socket_troupe:" + socketId)    // 0 Find the troupe associated with the socket
    .del("pr:socket_troupe:" + socketId)    // 1 Delete the socket troupe association
    .exec(function(err, replies) {
      if(err) return callback(err);

      var troupeId = replies[0];

      if(!troupeId) {
        // This is the case for TroupeNotifier and iOS app
        return callback();
      }

      eyeBallsOffTroupe(userId, socketId, troupeId, callback);
    });
}

function exclusiveLock(keyName, keyExpiry, callback) {
  redisClient.multi()
    .setnx(keyName, "lock")           // 0 - Set the key if it doesn't exist
    .pexpire(keyName, keyExpiry)      // 1 - Set it to expire
    .exec(function(err, replies) {
      if(err) return callback(err);
      var didNotExist = !!replies[0];   // Doesn't exist means we've obtained the lock

      return callback(null, didNotExist);
    });
}

function userSocketDisconnected(userId, socketId, options, callback) {
  if(!options) options = {};

  winston.debug("presence: userSocketDisconnected: ", { userId: userId, socketId: socketId });

  if(options.immediate) {
    process.nextTick(userSocketDisconnectedInternal);
  } else {
    // Give the user 10 seconds to re-login before marking them as offline
    setTimeout(userSocketDisconnectedInternal, 10000);
  }

  function userSocketDisconnectedInternal() {
    removeSocketFromUserSockets(socketId, userId, function(err, lastDisconnect) {
      if(err) return callback(err);

      if(lastDisconnect) {
        winston.info("presence: User " + userId + " is now offline");
      }

      return callback();
    });
  }

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
      if(saddResult != 1) {
        winston.warn("presence: socket" + socketId + " already registered to user");
        return callback();
      }

      redisClient.multi()
        .set("pr:socket:" + socketId, userId)           // 0 Associate user with socket
        .zincrby('pr:active_u', 1, userId)              // 1 Add user to active users
        .sadd("pr:activesockets", socketId)             // 2 Add socket to list of active sockets
        .exec(function(err, replies) {
          if(err) return callback(err);

          var zincrbyResult = parseInt(replies[1], 10);
          var sadd2Result = replies[2];

          if(zincrbyResult == 1) {
            winston.info("presence: User " + userId + " connected.");
          }

          if(sadd2Result != 1) {
           winston.warn("presence: Socket has already been added to the activesockets list " +
                          ". Something strange is happening.", { userId: userId, socketId: socketId });
          }

          return callback();
        });
    });



  },

  userSubscribedToTroupe: function(userId, troupeId, socketId, callback) {
    // Associate socket with troupe
    redisClient.setnx("pr:socket_troupe:" + socketId, troupeId, function(err, result) {
      if(err) return callback(err);

      if(!result) {
        winston.warn('presence: userSubscribedToTroupe: socket ' + socketId + ' is already associated with a troupe');
        return callback();
      }

      eyeBallsOnTroupe(userId, socketId, troupeId, callback);
    });

  },

  // Warning, because of the way Faye-Redis Engine works, this
  // method is likely to be called multiple times
  // so whatever we do, we need to handle that
  socketDisconnected: function(socketId, options, callback) {
    // de = disconnection event
    exclusiveLock('pr:de:' + socketId, 10000, function(err, obtained) {
      if(err) return callback(err);
      if(!obtained) return callback();

      winston.info("presence: Socket disconnected: " + socketId);
      attemptSocketDisconnected(0);
    });


    function attemptSocketDisconnected(retryCount) {
      // Disassociates the socket with user, the user with the socket, deletes the socket
      // returns the userId in the callback
      redisClient.multi()
        .get("pr:socket:" + socketId)           // 0 Find the user for the socket
        .del("pr:socket:" + socketId)           // 1 Remove the socket user association
        .srem("pr:activesockets", socketId)     // 2 remove the socket from active sockets
        .exec(function(err, replies) {
          if(err) return callback(err);

          var userId = replies[0];

          // If we have no trace of this socket, give the system a second to finish the
          // doing things before trying again. The connect/disconnect cycle may be very short
          // and the connect writes have not yet completed........
          if(!userId) {
            if(retryCount <= 0) {
              winston.debug("presence: Socket not registered. Giving it 1s and will try again....");

              setTimeout(function() { attemptSocketDisconnected(++retryCount); }, 1000);
              return;

            } else {
              winston.info("presence: Socket did not appear to be associated with a user: " + socketId);
              return callback();
            }
          }

          winston.info("presence: Disassociating socket " + socketId + " from troupe ");

          disassociateUserSocketFromTroupe(userId, socketId, function(err) {
            if(err) return callback(err);

            userSocketDisconnected(userId, socketId, options, callback);
          });

        });
    }

  },

  validateActiveUsers: function(engine, callback) {
    redisClient.zrange("pr:active_u", 0, -1, function(err, users) {
      if(err) return callback(err);

      if(!users.length) {
        winston.info("presence: No active users, validation skipped");
        return callback(null, 0);
      } else {
        winston.info("presence: Validating " + users.length + " active users");
      }

      var multi = redisClient.multi();
      users.forEach(function(userId) {
        multi.smembers('pr:user:' + userId);
      });

      multi.exec(function(err, userSocketsReply) {
        if(err) return callback(err);

        var promises = [];
        var invalidCount = 0;

        userSocketsReply.forEach(function(socketIds, index) {
          var userId = users[index];

          winston.info("presence: Validating " + socketIds.length + " sockets for " + userId);

          socketIds.forEach(function(socketId) {
            var d = Q.defer();
            promises.push(d.promise);

            engine.clientExists(socketId, function(exists) {
              if(exists) return d.resolve();

              invalidCount++;
              winston.info("presence: Invalid socket found for user" + userId);
              userSocketDisconnected(userId, socketId, { immediate: true }, d.makeNodeResolver());
            });

          });
        });

        Q.all(promises).then(function() { callback(null, invalidCount); }, callback);

      });
    });

  },

  validateActiveSockets: function(engine, callback) {
    if(!callback) callback = function(err) {
      if(err) {
        winston.error('presence. Error in validateActiveSockets:' + err, { exception: err });
      }
    };

    redisClient.smembers("pr:activesockets", function(err, sockets) {
      if(!sockets.length) {
        winston.debug('presence: Validation: No active sockets.');
        return callback(null, 0);
      }

      var invalidCount = 0;

      winston.info('presence: Validating ' + sockets.length + ' active sockets');
      var promises = [];

      sockets.forEach(function(socketId) {
        var d = Q.defer();
        promises.push(d.promise);

        engine.clientExists(socketId, function(exists) {
          if(!exists) {
            invalidCount++;
            winston.debug('Disconnecting invalid socket ' + socketId);
            module.exports.socketDisconnected(socketId, { immediate: true }, d.makeNodeResolver());
          } else {
            d.resolve();
          }
        });

      });

      Q.all(promises).then(function() { callback(null, invalidCount); }, callback);
    });
  },

  startPresenceGcService: function(engine) {
    setInterval(function() {
      var start = Date.now();

      module.exports.validateActiveSockets(engine, function(err, invalidSocketCount) {
        if(err) return winston.error('Error while validating active sockets: ' + err, { exception: err });

        module.exports.validateActiveUsers(engine, function(err, invalidUserCount) {
          if(err) return winston.error('Error while validating active users: ' + err, { exception: err });

          var total = Date.now() - start;
          var message = 'Presence GC took ' + total + 'ms and cleared out ' + invalidSocketCount + ' sockets and ' + invalidUserCount + ' invalid users';
          if(invalidSocketCount || invalidUserCount) {
            winston.warn(message);
          } else {
            winston.info(message);
          }

        });

      });
    }, nconf.get('presence:gcInterval'));
  },

  lookupUserIdForSocket: function(socketId, callback) {
    redisClient.get("pr:socket:" + socketId, callback);
  },

  findOnlineUsersForTroupe: function(troupeId, callback) {
    redisClient.zrangebyscore("pr:tr_u:" + troupeId, 1, '+inf', callback);
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
        .zinterstore(out_key, 2, 'pr:active_u',key)     // 1 intersect with online users
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

  },

  clientEyeballSignal: function(userId, socketId, eyeballsOn, callback) {
    redisClient.multi()
      .sismember("pr:user:" + userId, socketId)    // 0 Check if this socket is owned by this user
      .get("pr:socket_troupe:" + socketId)         // 1 Find the troupe associated with the socket
      .exec(function(err, replies) {
      if(err) return callback(err);

      var sIsMemberResult = replies[0];

      if(!sIsMemberResult) return callback('Invalid socketId');

      var troupeId = replies[1];
      if(!troupeId) return callback('Socket is not associated with a troupe');

      // We now trust that this socket belongs to this user, let's do some magic
      redisLock('pr:l:eb:' + socketId, 1000, function(done) {
        function unlock(err, result) {
          done(function() {
            callback(err, result);
          });
        }

        if(eyeballsOn) {
          winston.debug('presence: Eyeballs on: user ' + userId + ' troupe ' + troupeId);
          return eyeBallsOnTroupe(userId, socketId, troupeId, unlock);

        } else {
          winston.debug('presence: Eyeballs off: user ' + userId + ' troupe ' + troupeId);
          return eyeBallsOffTroupe(userId, socketId, troupeId, unlock);
        }

      });

    });



  }


};