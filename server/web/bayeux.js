/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var env               = require('../utils/env');
var logger            = env.logger;
var nconf             = env.config;
var stats             = env.stats;

var faye              = require('faye');
var fayeRedis         = require('faye-redis');
var oauth             = require('../services/oauth-service');
var troupeService     = require('../services/troupe-service');
var presenceService   = require('../services/presence-service');
var restful           = require('../services/restful');
var shutdown          = require('shutdown');
var contextGenerator  = require('./context-generator');
var appVersion        = require('./appVersion');
var mongoUtils        = require('../utils/mongo-utils');
var StatusError       = require('statuserror');
var bayeuxExtension   = require('./bayeux/extension');

var version = appVersion.getVersion();

// Strategies for authenticating that a user can subscribe to the given URL
var routes = [
  { re: /^\/api\/v1\/(?:troupes|rooms)\/(\w+)$/,
    validator: validateUserForSubTroupeSubscription },
  { re: /^\/api\/v1\/(?:troupes|rooms)\/(\w+)\/(\w+)$/,
    validator: validateUserForSubTroupeSubscription,
    populator: populateSubTroupeCollection },
  { re: /^\/api\/v1\/(?:troupes|rooms)\/(\w+)\/(\w+)\/(\w+)\/(\w+)$/,
    validator: validateUserForSubTroupeSubscription,
    populator: populateSubSubTroupeCollection },
  { re: /^\/api\/v1\/user\/(\w+)\/(\w+)$/,
    validator: validateUserForUserSubscription,
    populator: populateSubUserCollection },
  { re: /^\/api\/v1\/user\/(\w+)\/(?:troupes|rooms)\/(\w+)\/unreadItems$/,
    validator: validateUserForUserSubscription,
    populator: populateUserUnreadItemsCollection },
  { re: /^\/api\/v1\/user\/(\w+)$/,
    validator: validateUserForUserSubscription },
  { re: /^\/api\/v1\/ping(\/\w+)?$/,
    validator: validateUserForPingSubscription }
];

var superClientPassword = nconf.get('ws:superClientPassword');

function checkTroupeAccess(userId, troupeId, callback) {
  // TODO: use the room permissions model
  return troupeService.findById(troupeId)
    .then(function(troupe) {
      if(!troupe) return false;

      if(troupe.bans && troupe.bans.some(function(troupeBan) {
        return "" + userId == "" + troupeBan.userId;
      })) {
        // Banned from the room? You get to see nothing dog!
        return false;
      }

      if(troupe.security === 'PUBLIC') {
        return true;
      }

      // After this point, everything needs to be authenticated
      if(!userId) {
        return false;
      }

      var result = troupeService.userIdHasAccessToTroupe(userId, troupe);

      if(!result) {
        logger.info("Denied user " + userId + " access to troupe " + troupe.uri);
        return false;
      }

      return result;
    })
    .nodeify(callback);
}

// This strategy ensures that a user can access a URL under a troupe URL
function validateUserForSubTroupeSubscription(options, callback) {
  var userId = options.userId;
  var match = options.match;

  var troupeId = match[1];

  if(!mongoUtils.isLikeObjectId(troupeId)) {
    return callback(new StatusError(400, 'Invalid ID: ' + troupeId));
  }

  return checkTroupeAccess(userId, troupeId)
    .nodeify(callback);
}

// This is only used by the native client. The web client publishes to
// the url
function validateUserForPingSubscription(options, callback) {
  return callback(null, true);
}

// This strategy ensures that a user can access a URL under a /user/ URL
function validateUserForUserSubscription(options, callback) {
  var userId = options.userId;
  var match = options.match;
  var subscribeUserId = match[1];

  // All /user/ subscriptions need to be authenticated
  if(!userId) return false;

  if(!mongoUtils.isLikeObjectId(userId)) {
    return callback(new StatusError(400, 'Invalid ID: ' + userId));
  }

  var result = userId == subscribeUserId;

  return callback(null, result);
}

function populateSubUserCollection(options, callback) {
  var userId = options.userId;
  var match = options.match;
  var subscribeUserId = match[1];
  var collection = match[2];

  // All /user/ subscriptions need to be authenticated
  if(!userId) return false;

  if(userId != subscribeUserId) {
    return callback(null, [ ]);
  }

  switch(collection) {
    case "rooms":
    case "troupes":
      return restful.serializeTroupesForUser(userId, callback);

    default:
      logger.error('Unable to provide snapshot for ' + collection);
  }

  callback(null, [ ]);
}


function populateSubTroupeCollection(options, callback) {
  var userId = options.userId;
  var match = options.match;
  var troupeId = match[1];
  var collection = match[2];

  switch(collection) {
    case "chatMessages":
      return restful.serializeChatsForTroupe(troupeId, userId, callback);

    case "users":
      return restful.serializeUsersForTroupe(troupeId, userId, callback);

    case "events":
      return restful.serializeEventsForTroupe(troupeId, userId, callback);

    default:
      logger.error('Unable to provide snapshot for ' + collection);
  }

  callback(null, [ ]);
}

function populateSubSubTroupeCollection(options, callback) {
  var match = options.match;
  var troupeId = match[1];
  var collection = match[2];
  var subId = match[3];
  var subCollection = match[4];

  switch(collection + '-' + subCollection) {
    case "chatMessages-readBy":
      return restful.serializeReadBysForChat(troupeId, subId, callback);

  }

  callback(null, [ ]);
}

function populateUserUnreadItemsCollection(options, callback) {
  var userId = options.userId;
  var match = options.match;
  var subscriptionUserId = match[1];
  var troupeId = match[2];

  if(userId !== subscriptionUserId) {
    return callback(null, [ ]);
  }

  return restful.serializeUnreadItemsForTroupe(troupeId, userId, callback);
}

function getConnectionType(incoming) {
  if(!incoming) return 'online';

  switch(incoming) {
    case 'online': return 'online';
    case 'mobile': return 'mobile';

    default:
      return 'online';
  }
}

// Validate handshakes
var authenticator = bayeuxExtension({
  channel: '/meta/handshake',
  name: 'authenticator',
  failureStat: 'bayeux.handshake.deny',
  skipSuperClient: true,
  incoming: function(message, req, callback) {
    var ext = message.ext || {};

    var token = ext.token;

    if(!token) {
      return callback({ status: 401, message: "Access token required" });
    }

    oauth.validateAccessTokenAndClient(ext.token, function(err, tokenInfo) {
      if(err) return callback(err);

      if(!tokenInfo) {
        return callback({ status: 401, message: "Invalid access token" });
      }

      var user = tokenInfo.user;
      var oauthClient = tokenInfo.client;
      var userId = user && user.id;

      logger.verbose('bayeux: handshake', {
        appVersion: ext.appVersion,
        username: user && user.username,
        client: oauthClient.name
      });

      var connectionType = getConnectionType(ext.connType);
      var client = ext.client || '';
      var troupeId = ext.troupeId || '';
      var eyeballState = ext.eyeballs || '';

      // This is an UGLY UGLY hack, but it's the only
      // way possible to pass the userId to the outgoing extension
      // where we have the clientId (but not the userId)
      var id = message.id || '';
      message.id = [id, userId, connectionType, client, troupeId, eyeballState].join(':');

      return callback(null, message);
    });

  },

  outgoing: function(message, req, callback) {
    if(!message.ext) message.ext = {};
    message.ext.appVersion = version;

    // The other half of the UGLY hack,
    // get the userId out from the message
    var fakeId = message.id;
    if(!fakeId) {
      return callback(null, message);
    }

    var parts = fakeId.split(':');
    if(parts.length != 6) {
      return callback(null, message);
    }

    message.id = parts[0] || undefined; // id not required for an incoming message
    var userId = parts[1] || undefined;
    var connectionType = parts[2];
    var clientId = message.clientId;
    var client = parts[3] || undefined;
    var troupeId = parts[4] || undefined;
    var eyeballState = parseInt(parts[5], 10) || 0;

    if(!userId) {
      // Not logged in? Simply return
      return callback(null, message);
    }

    // Get the presence service involved around about now
    presenceService.userSocketConnected(userId, clientId, connectionType, client, troupeId, eyeballState, function(err) {

      if(err) {
        logger.warn("bayeux: Unable to associate connection " + clientId + ' to ' + userId, { troupeId: troupeId, client: client, exception: err });
        return callback(err);
      }

      logger.info("bayeux: connection " + clientId + ' is associated to ' + userId, { troupeId: troupeId, client: client });

      message.ext.userId = userId;

      // if(troupeId) {
      //   recentRoomService.saveLastVisitedTroupeforUserId(userId, troupeId);
      // }

      // If the troupeId was included, it means we've got a native
      // client and they'll be looking for a snapshot:
      contextGenerator.generateSocketContext(userId, troupeId, function(err, context) {
        if(err) return callback(err);

        message.ext.context = context;

        // Not possible to throw an error here, so just carry only
        callback(null, message);
      });

    });

  }

});

function destroyClient(clientId) {
  if(!clientId) return;

  process.nextTick(function() {
    var engine = server._server._engine;
    engine.destroyClient(clientId, function() {
      logger.info('bayeux: client ' + clientId + ' intentionally destroyed.');
    });

  });

}


// Authorize a sbscription message
// callback(err, allowAccess)
function authorizeSubscribe(message, callback) {
  var clientId = message.clientId;

  presenceService.lookupUserIdForSocket(clientId, function(err, userId, exists) {
    if(err) return callback(err);

    if(!exists) return callback({ status: 401, message: 'Socket association does not exist' });

    var match = null;

    var hasMatch = routes.some(function(route) {
      var m = route.re.exec(message.subscription);
      if(m) {
        match = { route: route, match: m };
      }
      return m;
    });

    if(!hasMatch) return callback({ status: 404, message: "Unknown subscription" });

    var validator = match.route.validator;
    var m = match.match;

    validator({ userId: userId, match: m, message: message, clientId: clientId }, callback);
  });

}

//
// Authorisation Extension - decides whether the user
// is allowed to connect to the subscription channel
//
var authorisor = bayeuxExtension({
  channel: '/meta/subscribe',
  name: 'authorisor',
  failureStat: 'bayeux.subscribe.deny',
  skipSuperClient: true,
  incoming: function(message, req, callback) {
    var snapshot = 1;
    if(message.ext && message.ext.snapshot === false) {
      snapshot = 0;
    }

    // Do we allow this user to connect to the requested channel?
    authorizeSubscribe(message, function(err, allowed) {
      if(err) return callback(err);

      if(!allowed) {
        return callback({ status: 403, message: "Authorisation denied."});
      }

      message.id = [message.id || '', snapshot].join(':');

      return callback(null, message);
    });

  },

  outgoing: function(message, req, callback) {
    var clientId = message.clientId;

    var parts = message.id && message.id.split(':');
    if(!parts || parts.length !== 2) return callback(null, message);

    message.id = parts[0] || undefined;
    var snapshot = parseInt(parts[1], 10) === 1;

    var match = null;

    var hasMatch = routes.some(function(route) {
      var m = route.re.exec(message.subscription);
      if(m) {
        match = { route: route, match: m };
      }
      return m;
    });

    if(!hasMatch) return callback(null, message);

    var populator = match.route.populator;
    var m = match.match;

    /* The populator is all about generating the snapshot for the client */
    if(!clientId || !populator || !snapshot) return callback(null, message);

    presenceService.lookupUserIdForSocket(clientId, function(err, userId, exists) {
      if(err) callback(err);

      if(!exists) return callback({ status: 401, message: "Snapshot failed. Socket not associated" });

      populator({ userId: userId, match: m }, function(err, data) {
        if(!message.ext) message.ext = {};
        message.ext.snapshot = data;
        return callback(null, message);
      });

    });

  }
});

// CONNECT extension
var noConnectForUnknownClients = bayeuxExtension({
  channel: '/meta/connect',
  name: 'doorman',
  failureStat: 'bayeux.connect.deny',
  skipSuperClient: true,
  incoming: function(message, req, callback) {
    var clientId = message.clientId;

    server._server._engine.clientExists(clientId, function(exists) {
      if(!exists) return callback({ status: 401, message: "Client does not exist"});

      presenceService.socketExists(clientId, function(err, exists) {
        if(err) return callback(err);

        if(!exists) return callback({ status: 401, message: "Socket association does not exist" });

        return callback(null, message);
      });

    });

  }
});

var pushOnlyServer = bayeuxExtension({
  name: 'pushOnly',
  skipSuperClient: true,
  incoming: function(message, req, callback) {
    if (message.channel == '/api/v1/ping2' || message.channel.match(/^\/meta\//)) {
      return callback();
    }

    return callback({ status: 403, message: "Push access denied" });
  },
});

var hidePassword = bayeuxExtension({
  name: 'hidePassword',
  outgoing: function(message, req, callback) {
    if (message.ext) delete message.ext.password;
    callback(null, message);
  }
});


var pingResponder = bayeuxExtension({
  channel: '/api/v1/ping2',
  name: 'pingResponder',
  failureStat: 'bayeux.ping.deny',
  incoming: function(message, req, callback) {
    // Remember we've got the ping reason if we need it
    //var reason = message.data && message.data.reason;

    var clientId = message.clientId;

    server._server._engine.clientExists(clientId, function(exists) {
      if(!exists) return callback({ status: 401, message: "Client does not exist"});

      presenceService.socketExists(clientId, function(err, exists) {
        if(err) return callback(err);

        if(!exists) return callback({ status: 401, message: "Socket association does not exist" });

        return callback(null, message);
      });

    });
  }
});

var superClient = {
  outgoing: function(message, callback) {
    message.ext = message.ext || {};
    message.ext.password = superClientPassword;
    callback(message);
  }
};

function getClientIp(req) {
  if(!req) return;

  if(req.headers && req.headers['x-forwarded-for']) {
    return req.headers['x-forwarded-for'];
  }

  if(req.connection && req.connection.remoteAddress) {
    return req.connection.remoteAddress;
  }

  return req.ip;
}

var logging = {
  incoming: function(message, req, callback) {
    switch(message.channel) {
      case '/meta/handshake':
        stats.eventHF('bayeux.handshake');

        /* Rate is for the last full 10s period */
        var connType = message.ext && message.ext.connType;
        var handshakeRate = message.ext && message.ext.rate;
        logger.verbose("bayeux: " + message.channel , { ip: getClientIp(req), connType: connType, rate: handshakeRate });
        break;

      case '/meta/connect':
        stats.eventHF('bayeux.connect');

        /* Rate is for the last full 10s period */
        var connectRate = message.ext && message.ext.rate;
        if(connectRate && connectRate > 1) {
          logger.verbose("bayeux: connect" , { ip: getClientIp(req), clientId: message.clientId, rate: connectRate });
        }
        break;

      case '/meta/subscribe':
        stats.eventHF('bayeux.subscribe');

        logger.verbose("bayeux: subscribe", { clientId: message.clientId, subs: message.subscription });
        break;
    }

    callback(message);
  },

  outgoing: function(message, req, callback) {
    if(message.channel === '/meta/handshake' ) {
      var ip = getClientIp(req);
      var clientId = message.clientId;
      logger.verbose("bayeux: handshake complete", { ip: ip, clientId: clientId });
    }
    callback(message);
  }
};

var adviseAdjuster = {
  outgoing: function(message, req, callback) {
    var error = message.error;

    if(error) {
      var errorCode = error.split(/::/)[0];
      if(errorCode) errorCode = parseInt(errorCode, 10);

      if(errorCode === 401) {
        var reconnect;

        // if(message.clientId) {
        //   logger.info('Destroying client', { clientId: message.clientId });
        //   // We've told the person to go away, destroy their faye client
        //   destroyClient(message.clientId);
        // }

        if(message.channel === '/meta/handshake') {
          // Handshake failing, go away
          reconnect = 'none';
        } else {
          // Rehandshake
          reconnect = 'handshake';
        }

        message.advice = {
          reconnect: reconnect,
          interval: 1000
        };
      }

      logger.info('bayeux: error', message);
    } else {
      if(message.channel === '/meta/handshake') {
        // * Already know there is no error. Reset the advice
        if(!message.advice) {
          message.advice = {
            reconnect: 'retry',
            interval:  1000 * nconf.get('ws:fayeInterval'),
            timeout:   1000 * nconf.get('ws:fayeTimeout')
          };
        }


      }
    }

    callback(message);
  }
};


var server = new faye.NodeAdapter({
  mount: '/faye',
  timeout: nconf.get('ws:fayeTimeout'),
  ping: nconf.get('ws:fayePing'),
  retry: nconf.get('ws:fayeRetry'),
  engine: {
    type: fayeRedis,
    client: env.redis.getClient(),
    subscriberClient: env.redis.createClient(),
    interval: nconf.get('ws:fayeInterval'),
    namespace: 'fr:'
  }
});

var client = server.getClient();

var STATS_FREQUENCY = 0.01;

faye.stringify = function(object) {
  try {
    var string = JSON.stringify(object);
    // Over cautious
    stats.eventHF('bayeux.message.count', 1, STATS_FREQUENCY);

    if(string) {
      stats.gaugeHF('bayeux.message.size', string.length, STATS_FREQUENCY);
    } else {
      stats.gaugeHF('bayeux.message.size', 0, STATS_FREQUENCY);
    }

    return string;
  } catch(e) {
    stats.event('bayeux.message.serialization_error');

    logger.error('Error while serializing JSON message', { exception: e });
    throw e;
  }
};

/* TEMPORARY DEBUGGING SOLUTION */
faye.logger = {
};

var logLevels = ['fatal', 'error'/*, 'warn', 'info'*/];
logLevels.forEach(function(level) {
  faye.logger[level] = function(msg) { logger[level]('faye: ' + msg.substring(0,180)); };
});


module.exports = {
  server: server,
  engine: server._server._engine,
  client: client,
  destroyClient: destroyClient,
  attach: function(httpServer) {

    // Attach event handlers
    server.addExtension(logging);
    server.addExtension(authenticator);
    server.addExtension(noConnectForUnknownClients);
    server.addExtension(authorisor);
    server.addExtension(pushOnlyServer);
    server.addExtension(hidePassword);
    server.addExtension(pingResponder);
    server.addExtension(adviseAdjuster);

    client.addExtension(superClient);

    ['connection:open', 'connection:close'].forEach(function(event) {
      server._server._engine.bind(event, function(clientId) {
        logger.verbose("faye-engine: Client " + clientId + ": " + event);
      });
    });

    /** Some logging */
    ['handshake', 'disconnect'].forEach(function(event) {
      server.bind(event, function(clientId) {
        logger.info("faye-server: Client " + clientId + ": " + event);
      });
    });

    server.bind('disconnect', function(clientId) {
      // Warning, this event is called simulateously on
      // all the servers that are connected to the same redis/faye
      // connection
      logger.info("Client " + clientId + " disconnected");
      presenceService.socketDisconnected(clientId, function(err) {
        if(err && err !== 404) { logger.error("bayeux: Error while attempting disconnection of socket " + clientId + ": " + err,  { exception: err }); }
      });
    });

    shutdown.addHandler('bayeux', 15, function(callback) {
      var engine = server._server._engine;
      engine.disconnect();
      setTimeout(callback, 1000);
    });

    server.attach(httpServer);
  }
};

