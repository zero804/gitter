/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var redis = require("../utils/redis"),
    nconf = require("../utils/config"),
    winston = require('winston'),
    events = require('events'),
    assert = require('assert'),
    appEvents = require('../app-events.js'),
    Q = require('q'),
    _ = require("underscore");

var presenceService = new events.EventEmitter();

var redisClient = redis.createClient();
var redisLock = require("redis-lock")(redis.createClient());

// Public methods are not prefixed
// Private methods start with an underscore _
// Private methods that assume locking has already occurred start with a __

function _lockOnUser(userId, callback) {
  assert(userId, 'userId expected');

  redisLock('pr:l:u:' + userId, 100, function(done) {
    return callback(done);
  });
}

function _keySocketUser(socketId) {
  return "pr:su:" + socketId;
}

function _keySocketTroupe(socketId) {
  return "pr:st:" + socketId;
}

function _keyTroupeUsers(troupeId) {
  return "pr:tu:" + troupeId;
}

function _keySocketEyeballStatus(socketId) {
  return "pr:se:" + socketId;
}

// callback(err, userSocketCount)
function __associateSocketAndActivateUser(userId, socketId, callback) {
  assert(userId, 'userId expected');
  assert(socketId, 'socketId expected');

  redisClient.setnx(_keySocketUser(socketId), userId, function(err, reply) {
    if(err) return callback(err);

    if(reply === 0)  {
      winston.silly('presence: __associateSocketAndActivateUser rejected. SETNX returned 0', {
        key: _keySocketUser(socketId),
        socketId: socketId,
        userId: userId
      });

      return callback({ lockFail: true });
    }

    redisClient.multi()
      .zincrby('pr:active_u', 1, userId)              // 0 Add user to active users
      .sadd("pr:activesockets", socketId)             // 1 Add socket to list of active sockets
      .exec(function(err, replies) {
        if(err) return callback(err);
        var userSocketCount = parseInt(replies[0], 10);
        var saddResult = replies[1];

        if(saddResult != 1) {
          winston.warn("presence: Socket has already been added to active sockets. Something fishy is happening.");
        }

        if(userSocketCount === 1) {
          presenceService.emit('userOnline', userId);
        }

        return callback(null, userSocketCount);
      });
  });
}

// Callback(err);
function __disassociateSocketAndDeactivateUserAndTroupe(socketId, userId, callback) {
  assert(userId, 'userId expected');
  assert(socketId, 'socketId expected');

  redisClient.del(_keySocketUser(socketId), function(err, reply) {
    if(err) return callback(err);

    if(reply === 0) {
      winston.silly('presence: __disassociateSocketAndDeactivateUserAndTroupe rejected. DEL returned 0', {
        key: _keySocketUser(socketId),
        socketId: socketId,
        userId: userId
      });

      return callback({ lockFail: true });
    }

    redisClient.multi()
      .zincrby('pr:active_u', -1, userId)              // 0 Add user to active users
      .zremrangebyscore('pr:active_u', '-inf', '0')    // 1 remove everyone with a score of zero
      .srem("pr:activesockets", socketId)              // 2 Add socket to list of active sockets
      .get(_keySocketTroupe(socketId))                 // 3 Get the troupe associated with this socket
      .del(_keySocketTroupe(socketId))                 // 4 Delete the troupe socket association
      .exec(function(err, replies) {
        if(err) return callback(err);

        var userSocketCount = parseInt(replies[0], 10);
        var sremResult = replies[2];
        var troupeId = replies[3];

        if(sremResult != 1) {
          winston.warn("presence: Socket has already been removed from active sockets. Something fishy is happening.");
        }

        // If the socket is not associated with a troupe, this is where it ends
        if(!troupeId) {
          if(userSocketCount === 0) {
            presenceService.emit('userOffline', userId);
          }

          return callback();
        }

        __eyeBallsOffTroupe(userId, socketId, troupeId, function(err) {
          if(err && !err.lockFail) {
            // Don't fail if the eyeballs are already off
            return callback(err);
          }

          if(userSocketCount === 0) {
            presenceService.emit('userOffline', userId);
          }

          return callback();
        });

      });
  });
}

function __associateSocketAndActivateTroupe(socketId, userId, troupeId, callback) {
  assert(userId, 'userId expected');
  assert(socketId, 'socketId expected');
  assert(troupeId, 'troupeId expected');

    // Associate socket with troupe
  redisClient.setnx(_keySocketTroupe(socketId), troupeId, function(err, result) {
    if(err) return callback(err);

    if(result === 0) {
      winston.silly('presence: __associateSocketAndActivateTroupe rejected. SETNX returned 0', {
        key: _keySocketTroupe(socketId),
        socketId: socketId,
        userId: userId
      });

      return callback({ lockFail: true });
    }

    __eyeBallsOnTroupe(userId, socketId, troupeId, callback);
  });
}


function userSocketConnected(userId, socketId, callback) {
  assert(userId, 'userId expected');
  assert(socketId, 'socketId expected');

  _lockOnUser(userId, function(done) {
    __associateSocketAndActivateUser(userId, socketId, function(err) {
      if(err) return done(function() { callback(err); } );

      done(callback);
    });
  });
}

function socketDisconnected(socketId, callback) {
  assert(socketId, 'socketId expected');

  lookupUserIdForSocket(socketId, function(err, userId) {
    if(err) return callback(err);
    if(!userId) {
      winston.silly('presence: socketDisconnected rejected. lookupUserIdForSocket did not find socket', {
        socketId: socketId,
        userId: userId
      });

      return callback({ lockFail: true });
    }

    _lockOnUser(userId, function(done) {
      __disassociateSocketAndDeactivateUserAndTroupe(socketId, userId, function(err) {
        if(err) return done(function() { callback(err); } );

        done(callback);
      });

    });
  });
}

//
// If the socket subscribes to a troupe, associate the socket with a troupe
// this will be used for eyeball signals
//
function userSubscribedToTroupe(userId, troupeId, socketId, callback) {
  assert(userId, 'userId expected');
  assert(socketId, 'socketId expected');
  assert(troupeId, 'troupeId expected');

  _lockOnUser(userId, function(done) {
    __associateSocketAndActivateTroupe(socketId, userId, troupeId, function(err) {
      if(err) return done(function() { callback(err); } );
      done(callback);
    });
  });
}

function __eyeBallsOnTroupe(userId, socketId, troupeId, callback) {
  assert(userId, 'userId expected');
  assert(socketId, 'socketId expected');
  assert(troupeId, 'troupeId expected');

  redisClient.setnx(_keySocketEyeballStatus(socketId), 1, function(err, result) {
    if(err) return callback(err);

    if(!result) {
      winston.silly('presence: __eyeBallsOnTroupe rejected. SETNX returned 0', {
        key: _keySocketEyeballStatus(socketId),
        socketId: socketId,
        userId: userId
      });
      return callback({ lockFail: true });
    }

    // increment the score for user in troupe_users zset
    redisClient.zincrby(_keyTroupeUsers(troupeId), 1, userId, function(err, reply) {
      if(err) return callback(err);

      var userScore = parseInt(reply, 10);                   // Score for user is returned as a string
      if(userScore == 1) {
        presenceService.emit('userJoinedTroupe', userId, troupeId);
      }

      return callback();
    });

  });

}

function __eyeBallsOffTroupe(userId, socketId, troupeId, callback) {
  assert(userId, 'userId expected');
  assert(socketId, 'socketId expected');
  assert(troupeId, 'troupeId expected');

  redisClient.del(_keySocketEyeballStatus(socketId), function(err, result) {
    if(err) return callback(err);

    if(result === 0) {
      winston.silly('presence: __eyeBallsOffTroupe rejected. SETNX returned 0', {
        key: _keySocketEyeballStatus(socketId),
        socketId: socketId,
        userId: userId
      });

      return callback({ lockFail: true });
    }

    var key =  _keyTroupeUsers(troupeId);
    redisClient.multi()
      .zincrby(key, -1, userId)            // 0 decrement the score for user in troupe_users zset
      .zremrangebyscore(key, '-inf', '0')  // 1 remove everyone with a score of zero (no longer in the troupe)
      .zcard(key)                          // 2 count the number of users left in the set
      .exec(function(err, replies) {
        if(err) return callback(err);

        var userInTroupeCount = parseInt(replies[0], 10);
        var userHasLeftTroupe = userInTroupeCount <= 0;
        var troupeIsEmpty = replies[2] === 0;

        if(troupeIsEmpty && !userHasLeftTroupe) {
          winston.warn("presence: Troupe is empty, yet user has not left troupe. Something is fishy.", { troupeId: troupeId, socketId: socketId, userId: userId });
        }

        if(userHasLeftTroupe) {
          presenceService.emit('userLeftTroupe', userId, troupeId);
        }

        if(troupeIsEmpty) {
          presenceService.emit('troupeEmpty', troupeId);
        }

        return callback();
      });
  });

}

function lookupUserIdForSocket (socketId, callback) {
  assert(socketId, 'socketId expected');

  redisClient.get(_keySocketUser(socketId), callback);
}

function findOnlineUsersForTroupe(troupeId, callback) {
  assert(troupeId, 'troupeId expected');

  redisClient.zrangebyscore(_keyTroupeUsers(troupeId), 1, '+inf', callback);
}

// Given an array of usersIds, returns a hash with the status of each user. If the user is no in the hash
// it implies that they're offline
// callback(err, status)
// with status[userId] = 'online' / <missing>
function categorizeUsersByOnlineStatus(userIds, callback) {
  if(!userIds || userIds.length === 0) return callback(null, {});

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
}

function listOnlineUsers(callback) {
  redisClient.zrange("pr:active_u", 0, -1, callback);
}

// Returns the online users for the given troupes
// The callback function returns a hash
// result[troupeId] = [userIds]
function listOnlineUsersForTroupes(troupeIds, callback) {
  if(!troupeIds || troupeIds.length === 0) return callback(null, {});

  troupeIds = _.uniq(troupeIds);

  var multi = redisClient.multi();

  troupeIds.forEach(function(troupeId) {
    multi.zrangebyscore(_keyTroupeUsers(troupeId), 1, '+inf');
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

function clientEyeballSignal(userId, socketId, eyeballsOn, callback) {
  assert(userId, 'userId expected');
  assert(socketId, 'socketId expected');

  redisClient.multi()
    .get(_keySocketUser(socketId))        // 0 Check if this socket is owned by this user
    .get(_keySocketTroupe(socketId))      // 1 Find the troupe associated with the socket
    .exec(function(err, replies) {
    if(err) return callback(err);

    var userId2 = replies[0];
    if(userId !== userId2) {
      winston.warn("User " + userId + " attempted to eyeball socket " + socketId + " but that socket belongs to " + userId2);
      return callback('Invalid socketId');
    }

    var troupeId = replies[1];
    if(!troupeId) return callback('Socket is not associated with a troupe');

    _lockOnUser(userId, function(done) {
      function unlock(err, result) {
        done(function() {
          callback(err, result);
        });
      }

      if(eyeballsOn) {
        winston.verbose('presence: Eyeballs on: user ' + userId + ' troupe ' + troupeId);
        return __eyeBallsOnTroupe(userId, socketId, troupeId, unlock);

      } else {
        winston.verbose('presence: Eyeballs off: user ' + userId + ' troupe ' + troupeId);
        return __eyeBallsOffTroupe(userId, socketId, troupeId, unlock);
      }

    });

  });

}


function collectGarbage(engine, callback) {
  var start = Date.now();

  _validateActiveSockets(engine, function(err, invalidSocketCount) {
    if(err) {
      winston.error('Error while validating active sockets: ' + err, { exception: err });
      return callback(err);
    }

    var total = Date.now() - start;
    var message = 'Presence GC took ' + total + 'ms and cleared out ' + invalidSocketCount + ' sockets';

    if(invalidSocketCount) {
      winston.warn(message);
    } else {
      winston.silly(message);
    }

    return callback();
  });

}

function startPresenceGcService(engine) {
  setInterval(function() {
    collectGarbage(engine, function() {});
  }, nconf.get('presence:gcInterval'));
}


function _validateActiveSockets(engine, callback) {
  redisClient.smembers("pr:activesockets", function(err, sockets) {
    if(!sockets.length) {
      winston.verbose('presence: Validation: No active sockets.');
      return callback(null, 0);
    }

    var invalidCount = 0;

    winston.verbose('presence: Validating ' + sockets.length + ' active sockets');
    var promises = [];

    sockets.forEach(function(socketId) {
      var d = Q.defer();
      promises.push(d.promise);

      engine.clientExists(socketId, function(exists) {
        if(exists) return d.resolve();

        invalidCount++;
        winston.verbose('Disconnecting invalid socket ' + socketId);
        socketDisconnected(socketId, function(err) {
          if(err && !err.lockFail) d.reject(err);

          d.resolve();
        });
      });

    });

    Q.all(promises).then(function() { callback(null, invalidCount); }, callback);
  });
}

  // Connections and disconnections
presenceService.userSocketConnected = userSocketConnected,
presenceService.userSubscribedToTroupe =  userSubscribedToTroupe;
presenceService.socketDisconnected =  socketDisconnected;


// Query Status
presenceService.lookupUserIdForSocket =  lookupUserIdForSocket;
presenceService.findOnlineUsersForTroupe =  findOnlineUsersForTroupe;
presenceService.categorizeUsersByOnlineStatus =  categorizeUsersByOnlineStatus;
presenceService.listOnlineUsers =  listOnlineUsers;
presenceService.listOnlineUsersForTroupes =  listOnlineUsersForTroupes;

// Eyeball
presenceService.clientEyeballSignal =  clientEyeballSignal;

  // GC
presenceService.collectGarbage =  collectGarbage;
presenceService.startPresenceGcService =  startPresenceGcService;



// -------------------------------------------------------------------
// Default Events
// -------------------------------------------------------------------

presenceService.on('userOnline', function(userId) {
  winston.info("presence: User " + userId + " connected.");
});

presenceService.on('userOffline', function(userId) {
  winston.info("presence: User " + userId + " disconnected.");
});

presenceService.on('userJoinedTroupe', function(userId, troupeId) {
  /* User joining this troupe for the first time.... */
  winston.info("presence: User " + userId + " has just joined " + troupeId);
  appEvents.userLoggedIntoTroupe(userId, troupeId);
});

presenceService.on('userLeftTroupe', function(userId, troupeId) {
  winston.info("presence: User " + userId + " is gone from " + troupeId);

  appEvents.userLoggedOutOfTroupe(userId, troupeId);
});

presenceService.on('troupeEmpty', function(troupeId) {
  winston.info("presence: The last user has disconnected from troupe " + troupeId);
});

module.exports = presenceService;

