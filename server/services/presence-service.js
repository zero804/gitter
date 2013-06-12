/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var redis = require("../utils/redis"),
    nconf = require("../utils/config"),
    winston = require('winston'),
    events = require('events'),
    assert = require('assert'),
    Fiber = require('../utils/fiber'),
    appEvents = require('../app-events.js'),
    Q = require('q'),
    _ = require("underscore");

var presenceService = new events.EventEmitter();

var redisClient = redis.createClient();

var Scripto = require('redis-scripto');
var scriptManager = new Scripto(redisClient);
scriptManager.loadFromDir(__dirname + '/../../redis-lua/presence');


var prefix = nconf.get('presence:prefix') + ':';

var ACTIVE_USERS_KEY = prefix + 'active_u';
var MOBILE_USERS_KEY = prefix + 'mobile_u';

var ACTIVE_SOCKETS_KEY = prefix + 'activesockets';


// Public methods are not prefixed
// Private methods start with an underscore _
// Private methods that assume locking has already occurred start with a __
function _keyUserLock(userId) {
  return prefix + "ul:" + userId;
}

function _keySocketUser(socketId) {
  return prefix + "sh:" + socketId;
}

function _keyTroupeUsers(troupeId) {
  return prefix + "tu:" + troupeId;
}


// Callback(err);
function __disassociateSocketAndDeactivateUserAndTroupe(socketId, userId, callback) {
  assert(userId, 'userId expected');
  assert(socketId, 'socketId expected');

  lookupTroupeIdForSocket(socketId, function(err, troupeId) {
    if(err) return callback(err);

    var keys = [_keySocketUser(socketId), ACTIVE_USERS_KEY, MOBILE_USERS_KEY, ACTIVE_SOCKETS_KEY, _keyUserLock(userId), troupeId ? _keyTroupeUsers(troupeId) : null];
    var values = [userId, socketId];

    scriptManager.run('presence-disassociate', keys, values, function(err, result) {
      if(err) return callback(err);

      var deleteSuccess = result[0];
      if(!deleteSuccess) {
        winston.silly('presence: __disassociateSocketAndDeactivateUserAndTroupe rejected. Socket already deleted.', {
          socketId: socketId,
          userId: userId
        });

        return callback({ lockFail: true });
      }

      var userSocketCount = parseInt(result[1], 10);
      var sremResult = result[2];

      var userInTroupeCount = parseInt(result[3], 10);
      var userHasLeftTroupe = userInTroupeCount === 0;
      var troupeIsEmpty = result[4] === 0;

      if(sremResult != 1) {
        winston.warn("presence: Socket has already been removed from active sockets. Something fishy is happening.");
      }

      if(userSocketCount === 0) {
        presenceService.emit('userOffline', userId);
      }


      // Warning: similar code exists in __eyeBallsOffTroupe!

      if(troupeIsEmpty && !userHasLeftTroupe) {
        winston.warn("presence: Troupe is empty, yet user has not left troupe. Something is fishy.", { troupeId: troupeId, socketId: socketId, userId: userId });
      }

      if(userHasLeftTroupe) {
        presenceService.emit('userLeftTroupe', userId, troupeId);
      }

      appEvents.eyeballSignal(userId, troupeId, false);

      if(troupeIsEmpty) {
        presenceService.emit('troupeEmpty', troupeId);
      }

      return callback();
    });
  });


}

function __associateSocketAndActivateTroupe(socketId, userId, troupeId, eyeballState, callback) {
  assert(userId, 'userId expected');
  assert(socketId, 'socketId expected');
  assert(troupeId, 'troupeId expected');

  winston.verbose('Associate socket and activate troupe', {
    userId: userId,
    socketId: socketId,
    troupeId: troupeId,
    eyeballState: eyeballState
  });

  var keys = [_keySocketUser(socketId), _keyUserLock(userId)];
  var values = [troupeId];

  scriptManager.run('presence-associate-troupe', keys, values, function(err, result) {
    if(err) return callback(err);

    if(result === 0) {
      winston.silly('presence: __associateSocketAndActivateTroupe rejected. Socket already appears to be associated with a troupe', {
        socketId: socketId,
        userId: userId
      });

      return callback({ lockFail: true });
    }

    if(eyeballState) {
      __eyeBallsOnTroupe(userId, socketId, troupeId, function(err) {
        if(err) {
          winston.error('Unable to signal eyeballs on: ' + err, {
            userId: userId,
            socketId: socketId,
            exception: err
          });
        }

        // Ignore the error
        return callback();
      });
    } else {
      return callback();
    }
  });

}


function userSocketConnected(userId, socketId, connectionType, callback) {
  assert(userId, 'userId expected');
  assert(socketId, 'socketId expected');

  var isMobileConnection = connectionType == 'mobile';

  var keys = [_keySocketUser(socketId), ACTIVE_USERS_KEY, MOBILE_USERS_KEY, ACTIVE_SOCKETS_KEY, _keyUserLock(userId)];
  var values = [userId, socketId, Date.now(), isMobileConnection ? 1 : 0];

  scriptManager.run('presence-associate', keys, values, function(err, result) {
    if(err) return callback(err);

    var lockSuccess = result[0];

    if(!lockSuccess)  {
      winston.silly('presence: __associateSocketAndActivateUser rejected. Socket already exists.', {
        socketId: socketId,
        userId: userId
      });

      return callback({ lockFail: true });
    }

    var userSocketCount = parseInt(result[1], 10);
    var saddResult = result[2];

    if(saddResult != 1) {
      winston.warn("presence: Socket has already been added to active sockets. Something fishy is happening.");
    }

    if(userSocketCount === 1) {
      presenceService.emit('userOnline', userId);
    }

    return callback(null, userSocketCount);

  });

}

function socketDisconnectionRequested(userId, socketId, callback) {
  assert(socketId, 'socketId expected');
  assert(userId, 'userId expected');

  lookupUserIdForSocket(socketId, function(err, userId2) {
    if(err) return callback(err);
    if(userId !== userId2) {
      return callback(401);
    }

    __disassociateSocketAndDeactivateUserAndTroupe(socketId, userId, function(err) {
      callback(err);
    });

  });
}


function socketDisconnected(socketId, callback) {
  assert(socketId, 'socketId expected');

  lookupUserIdForSocket(socketId, function(err, userId) {
    if(err) return callback(err);
    if(!userId) {
      return callback({ lockFail: true });
    }

    __disassociateSocketAndDeactivateUserAndTroupe(socketId, userId, function(err) {
      callback(err);
    });

  });
}

function _socketGarbageCollected(socketId, callback) {
  socketDisconnected(socketId, function(err) {
    if(err && !err.lockFail) {
      // Force socket disconnect

      var keys = [_keySocketUser(socketId), ACTIVE_SOCKETS_KEY];
      var values = [socketId];

      scriptManager.run('presence-force-disassociate', keys, values, callback);
      return;
    }

    callback();
  });
}

//
// If the socket subscribes to a troupe, associate the socket with a troupe
// this will be used for eyeball signals
//
function userSubscribedToTroupe(userId, troupeId, socketId, eyeballState, callback) {
  assert(userId, 'userId expected');
  assert(socketId, 'socketId expected');
  assert(troupeId, 'troupeId expected');

  __associateSocketAndActivateTroupe(socketId, userId, troupeId, eyeballState, callback);
}

function __eyeBallsOnTroupe(userId, socketId, troupeId, callback) {
  assert(userId, 'userId expected');
  assert(socketId, 'socketId expected');
  assert(troupeId, 'troupeId expected');

  var keys = [_keySocketUser(socketId), _keyTroupeUsers(troupeId), _keyUserLock(userId)];
  var values = [userId];

  scriptManager.run('presence-eyeballs-on', keys, values, function(err, result) {
    if(err) return callback(err);
    var eyeballLock = result[0];

    if(!eyeballLock) {
      winston.silly('presence: __eyeBallsOnTroupe rejected. SETNX returned 0', {
        socketId: socketId,
        userId: userId
      });

      return callback({ lockFail: true });
    }


    var userScore = parseInt(result[1], 10);                   // Score for user is returned as a string
    if(userScore == 1) {
      presenceService.emit('userJoinedTroupe', userId, troupeId);
    }

    appEvents.eyeballSignal(userId, troupeId, true);

    return callback();

  });

}

function __eyeBallsOffTroupe(userId, socketId, troupeId, callback) {
  assert(userId, 'userId expected');
  assert(socketId, 'socketId expected');
  assert(troupeId, 'troupeId expected');

  var keys = [_keySocketUser(socketId), _keyTroupeUsers(troupeId), _keyUserLock(userId)];
  var values = [userId];

  scriptManager.run('presence-eyeballs-off', keys, values, function(err, result) {
    if(err) return callback(err);

    var eyeballLock = result[0];

    if(!eyeballLock) {
      winston.silly('presence: __eyeBallsOffTroupe rejected. Eyeball value is already zero', {
        socketId: socketId,
        userId: userId
      });

      return callback();
    }

    var userInTroupeCount = parseInt(result[1], 10);
    var userHasLeftTroupe = userInTroupeCount === 0;
    var troupeIsEmpty = result[2] === 0;

    // WARNING: __disassociateSocketAndDeactivateUserAndTroupe has similar code!
    if(troupeIsEmpty && !userHasLeftTroupe) {
      winston.warn("presence: Troupe is empty, yet user has not left troupe. Something is fishy.", { troupeId: troupeId, socketId: socketId, userId: userId });
    }

    if(userHasLeftTroupe) {
      presenceService.emit('userLeftTroupe', userId, troupeId);
    }

    appEvents.eyeballSignal(userId, troupeId, false);

    if(troupeIsEmpty) {
      presenceService.emit('troupeEmpty', troupeId);
    }

    return callback();

  });

}

// Callback -> (err, { userId: X, troupeId: Y })
function _lookupSocketOwnerAndTroupe(socketId, callback) {
  redisClient.hmget(_keySocketUser(socketId), "uid", "tid", function(err, result) {
    if(err) return callback(err);

    callback(null, {
      userId: result[0],
      troupeId: result[1]
    });
  });
}

function lookupUserIdForSocket (socketId, callback) {
  assert(socketId, 'socketId expected');

  redisClient.hget(_keySocketUser(socketId), "uid", callback);
}

function lookupTroupeIdForSocket (socketId, callback) {
  assert(socketId, 'socketId expected');

  redisClient.hget(_keySocketUser(socketId), "tid", callback);
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
  var key = prefix + "presence_temp_set:" + process.pid + ":" + t[0] + ":" + t[1];
  var out_key = prefix + "presence_temp_set:" + process.pid + ":" + t[0] + ":" + t[1] + '_out';

  var keys = [key, out_key, ACTIVE_USERS_KEY];
  var values = userIds;

  scriptManager.run('presence-categorize-users', keys, values, function(err, onlineUsers) {
    var result = {};
    if(onlineUsers) onlineUsers.forEach(function(userId) {
      result[userId] = 'online';
    });

    return callback(null, result);
  });

}

function categorizeUserTroupesByOnlineStatus(userTroupes, callback) {
  var f = new Fiber();

  var troupeIds = _.uniq(userTroupes.map(function(userTroupe) { return userTroupe.troupeId; }));
  var userIds = _.uniq(userTroupes.map(function(userTroupe) { return userTroupe.userId; }));

  listOnlineUsersForTroupes(troupeIds, f.waitor());
  categorizeUsersByOnlineStatus(userIds, f.waitor());

  f.all().spread(function(troupeOnlineUsers, statii) {
    var inTroupe = [];
    var online = [];
    var offline = [];

    userTroupes.forEach(function(userTroupe) {
      var userId = userTroupe.userId;
      var troupeId = userTroupe.troupeId;

      var onlineForTroupe = troupeOnlineUsers[troupeId];
      if(onlineForTroupe.indexOf(userId) >= 0) {
        inTroupe.push(userTroupe);
      } else if(statii[userId] == 'online') {
        online.push(userTroupe);
      } else {
        offline.push(userTroupe);
      }
    });

    callback(null, {
      inTroupe: inTroupe,
      online: online,
      offline: offline
    });

  }, callback);
}

function listOnlineUsers(callback) {
  redisClient.zrange(ACTIVE_USERS_KEY, 0, -1, callback);
}

function listMobileUsers(callback) {
  redisClient.zrange(MOBILE_USERS_KEY, 0, -1, callback);
}

function listActiveSockets(callback) {
  // This can't be done in a lua script as we don't know the keys in advance
  redisClient.smembers(ACTIVE_SOCKETS_KEY, function(err, socketIds) {
    if(err) return callback(err);
    if(socketIds.length === 0) return callback(err, []);

    var multi = redisClient.multi();
    socketIds.forEach(function(socketId) {
      multi.hmget(_keySocketUser(socketId), 'uid', 'tid', 'eb', 'mob', 'ctime');
    });
    multi.exec(function(err, replies) {
      if(err) return callback(err);

      var result = replies.map(function(reply, index) {
        return {
          id: socketIds[index],
          userId: reply[0],
          troupeId: reply[1],
          eyeballs: !!reply[2],
          mobile: !!reply[3],
          createdTime: parseInt(reply[4], 10)
        };
      });

      return callback(null, result);
    });
  });
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

  _lookupSocketOwnerAndTroupe(socketId, function(err, socketInfo) {
    if(err) return callback(err);
    if(!socketInfo) {
      winston.warn("User " + userId + " attempted to eyeball missing socket " + socketId);
      return callback({ invalidSocketId: true });
    }

    var userId2 = socketInfo.userId;
    if(userId !== userId2) {
      winston.warn("User " + userId + " attempted to eyeball socket " + socketId + " but that socket belongs to " + userId2);
      return callback({ invalidSocketId: true });
    }

    var troupeId = socketInfo.troupeId;
    if(!troupeId) return callback('Socket is not associated with a troupe');

    if(eyeballsOn) {
      winston.verbose('presence: Eyeballs on: user ' + userId + ' troupe ' + troupeId);
      return __eyeBallsOnTroupe(userId, socketId, troupeId, callback);

    } else {
      winston.verbose('presence: Eyeballs off: user ' + userId + ' troupe ' + troupeId);
      return __eyeBallsOffTroupe(userId, socketId, troupeId, callback);
    }


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

    return callback(null, invalidSocketCount);
  });

}


function startPresenceGcService(engine) {
  var i = 0;
  setInterval(function() {
    collectGarbage(engine, function(err) {
      if(err) return;

      if(++i % 10 === 0) {
        winston.verbose('Performing user validation');
        validateUsers(function(err) {
          winston.verbose('User validation complete');

          if(err) return;
        });
      }
    });
  }, nconf.get('presence:gcInterval'));
}


function _validateActiveSockets(engine, callback) {
  redisClient.smembers(ACTIVE_SOCKETS_KEY, function(err, sockets) {
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

        _socketGarbageCollected(socketId, function(err) {

          if(err && !err.lockFail) {
            winston.info('Failure while gc-ing invalid socket', { exception: err });
          }

          d.resolve();
        });
      });

    });

    Q.all(promises).then(function() { callback(null, invalidCount); }, callback);
  });
}

function _hashZset(scoresArray) {
  var hash = {};
  for(var i = 0; i < scoresArray.length; i = i + 2) {
    hash[scoresArray[i]] = parseInt(scoresArray[i + 1], 10);
  }
  return hash;
}

function introduceDelayForTesting(cb) {
  if(presenceService.testOnly.forceDelay) {
    setTimeout(cb, 120);
  } else {
    cb();
  }
}

function _validateUsers(userIds, callback) {
  winston.debug('Validating users', { userIds: userIds });
  // Use a new client due to the WATCH semantics
  var redisClient = redis.createClient();

  function done(err) {
    redisClient.quit();
    return callback(err);
  }

  redisClient.watch(userIds.map(_keyUserLock), introduceDelayForTesting(function(err) {
    if(err) return done(err);

    listActiveSockets(function(err, sockets) {
      if(err) return done(err);

      var onlineCounts = {};
      var mobileCounts = {};
      var troupeCounts = {};
      var troupeIdsHash = {};

      // This can't be done in the script manager
      // as that is using a different redis connection
      // and besides we don't know the semanitcs of WATCH
      // in Lua :)

      sockets.forEach(function(socket) {
        var userId = socket.userId;
        var troupeId = socket.troupeId;

        if(userIds.indexOf(userId) >= 0) {
          if(troupeId) {
            troupeIdsHash[troupeId] = true;
            if(socket.eyeballs) {
              if(!troupeCounts[userId]) {
                troupeCounts[userId] = { troupeId: 1 };
              } else {
                troupeCounts[userId][troupeId] = troupeCounts[userId][troupeId] ? troupeCounts[userId][troupeId] + 1 : 1;
              }
            }
          }

          if(socket.mobile) {
            mobileCounts[userId] = mobileCounts[userId] ? mobileCounts[userId] + 1 : 1;
          } else {
            onlineCounts[userId] = onlineCounts[userId] ? onlineCounts[userId] + 1 : 1;
          }
        }
      });

      var f = new Fiber();
      var troupeIds = Object.keys(troupeIdsHash);

      redisClient.zrangebyscore(ACTIVE_USERS_KEY, 1, '+inf', 'WITHSCORES', f.waitor());
      redisClient.zrangebyscore(MOBILE_USERS_KEY, 1, '+inf', 'WITHSCORES', f.waitor());

      troupeIds.forEach(function(troupeId) {
        redisClient.zrangebyscore(_keyTroupeUsers(troupeId), 1, '+inf', 'WITHSCORES', f.waitor());
      });

      f.all().then(function(results) {
        var needsUpdate = false;
        var multi = redisClient.multi();

        var currentActiveUserHash = _hashZset(results[0]);
        var currentMobileUserHash = _hashZset(results[1]);

        userIds.forEach(function(userId) {
          var currentActiveScore = currentActiveUserHash[userId] || 0;
          var currentMobileScore = currentMobileUserHash[userId] || 0;

          var calculatedActiveScore = onlineCounts[userId] || 0;
          var calculatedMobileScore = mobileCounts[userId] || 0;

          if(calculatedActiveScore !== currentActiveScore) {
            winston.info('Inconsistency in active score in presence service for user ', {
              a: typeof calculatedActiveScore,
              b: typeof currentActiveScore
            });
            winston.info('Inconsistency in active score in presence service for user ' + userId + '. ' + calculatedActiveScore + ' vs ' + currentActiveScore);

            needsUpdate = true;
            multi.zrem(ACTIVE_USERS_KEY, userId);
            if(calculatedActiveScore > 0) {
              multi.zincrby(ACTIVE_USERS_KEY, calculatedActiveScore, userId);
            }
          }

          if(calculatedMobileScore !== currentMobileScore) {
            winston.info('Inconsistency in mobile score in presence service for user ' + userId + '. ' + currentMobileScore + ' vs ' + calculatedMobileScore);

            needsUpdate = true;
            multi.zrem(MOBILE_USERS_KEY, userId);
            if(calculatedActiveScore > 0) {
              multi.zincrby(MOBILE_USERS_KEY, calculatedMobileScore, userId);
            }
          }
        });

        // Now check each troupeId for each userId
        troupeIds.forEach(function(troupeId, index) {
          var userTroupeScores = _hashZset(results[2 + index]);

          userIds.forEach(function(userId) {
            var currentTroupeScore = userTroupeScores[userId] || 0;

            var calculatedTroupeScore = troupeCounts[userId] && troupeCounts[userId][troupeId] || 0;

            if(calculatedTroupeScore !== currentTroupeScore) {
              winston.info('Inconsistency in troupe score in presence service for user ' + userId + ' in troupe ' + troupeId + '. ' + calculatedTroupeScore + ' vs ' + currentTroupeScore);

              needsUpdate = true;
              var key = _keyTroupeUsers(troupeId);
              multi.zrem(key, userId);
              if(calculatedTroupeScore > 0) {
                multi.zincrby(key, calculatedTroupeScore, userId);
              }
            }

          });
        });

        // Nothing to do? Finish
        if(!needsUpdate) return done();

        multi.exec(function(err, replies) {
          if(err) return done(err);

          if(!replies) {
            winston.info('Transaction rolled back.');
            return done({ rollback: true });
          }

          return done();
        });


      }, done);


    });

  }));


}

function validateUsers(callback) {
  var start = Date.now();

  listOnlineUsers(function(err, userIds) {
    if(err) return callback(err);

    if(userIds.length === 0) return callback();

    var userId = null;
    function recurseUserIds(err) {
      if(err && !err.rollback) {
        return callback(err);
      }

      if(!err || !err.rollback) {
        userId = null;
      }

      if(!userId) {
        if(userIds.length === 0) {
          var total = Date.now() - start;
          winston.info('Presence.validateUsers GC took ' + total + 'ms');
          return callback();
        }

        userId = userIds.shift();
      }

      _validateUsers([userId], recurseUserIds);
    }

    recurseUserIds();
  });
}

  // Connections and disconnections
presenceService.userSocketConnected = userSocketConnected,
presenceService.userSubscribedToTroupe =  userSubscribedToTroupe;
presenceService.socketDisconnected =  socketDisconnected;
presenceService.socketDisconnectionRequested = socketDisconnectionRequested;

// Query Status
presenceService.lookupUserIdForSocket =  lookupUserIdForSocket;
presenceService.findOnlineUsersForTroupe =  findOnlineUsersForTroupe;
presenceService.categorizeUsersByOnlineStatus =  categorizeUsersByOnlineStatus;
presenceService.listOnlineUsers = listOnlineUsers;
presenceService.listActiveSockets = listActiveSockets;
presenceService.listMobileUsers =  listMobileUsers;
presenceService.listOnlineUsersForTroupes =  listOnlineUsersForTroupes;
presenceService.categorizeUserTroupesByOnlineStatus = categorizeUserTroupesByOnlineStatus;

// Eyeball
presenceService.clientEyeballSignal =  clientEyeballSignal;

  // GC
presenceService.collectGarbage =  collectGarbage;
presenceService.startPresenceGcService =  startPresenceGcService;

presenceService.validateUsers = validateUsers;

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

presenceService.testOnly = {
  ACTIVE_USERS_KEY: ACTIVE_USERS_KEY,
  _validateUsers: _validateUsers,
  forceDelay: false

};


module.exports = presenceService;

