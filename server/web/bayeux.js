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

var appTag = appVersion.getAppTag();

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

function messageIsFromSuperClient(message) {
  return message &&
         message.ext &&
         message.ext.password === superClientPassword;
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

var authenticator = {
  incoming: function(message, callback) {
    function deny(errorCode, errorDescription) {
      stats.eventHF('bayeux.handshake.deny');

      message.error = errorCode + '::' + errorDescription;
      logger.error('Denying client access', message);

      callback(message);
    }

    if (message.channel != '/meta/handshake') {
      return callback(message);
    }

    if(messageIsFromSuperClient(message)) {
      return callback(message);
    }

    var ext = message.ext || {};

    var token = ext.token;

    if(!token) {
      return deny(401, "Access token required");
    }

    oauth.validateAccessTokenAndClient(ext.token, function(err, tokenInfo) {
      if(err) {
        logger.error("bayeux: Authentication error: " + err, { exception: err, message: message });
        return deny(500, "A server error occurred.");
      }

      if(!tokenInfo) {
        logger.warn("bayeux: Authentication failed. Invalid access token.", { token: token });
        return deny(401, "Invalid access token");
      }

      var user = tokenInfo.user;
      var oauthClient = tokenInfo.client;
      var userId = user && user.id;
      logger.verbose('bayeux: handshake', { username: user && user.username, client: oauthClient.name });

      var connectionType = getConnectionType(ext.connType);
      var client = ext.client || '';
      var troupeId = ext.troupeId || '';
      var eyeballState = ext.eyeballs || '';

      // This is an UGLY UGLY hack, but it's the only
      // way possible to pass the userId to the outgoing extension
      // where we have the clientId (but not the userId)
      var id = message.id || '';
      message.id = [id, userId, connectionType, client, troupeId, eyeballState].join(':');

      return callback(message);
    });

  },

  outgoing: function(message, callback) {
    if (message.channel != '/meta/handshake') {
      return callback(message);
    }

    // Already failed?
    if(!message.successful)  {
      return callback(message);
    }

    if(!message.ext) message.ext = {};
    message.ext.appVersion = appTag;

    // The other half of the UGLY hack,
    // get the userId out from the message
    var fakeId = message.id;
    if(!fakeId) {
      return callback(message);
    }

    var parts = fakeId.split(':');
    if(parts.length != 6) {
      return callback(message);
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
      return callback(message);
    }

    logger.verbose("bayeux: about to associate connection " + clientId + ' to user ' + userId, { troupeId: troupeId, client: client });

    // Get the presence service involved around about now
    presenceService.userSocketConnected(userId, clientId, connectionType, client, troupeId, eyeballState, function(err) {
      logger.info("bayeux: connection " + clientId + ' is associated to ' + userId, { troupeId: troupeId, client: client });

      if(err) logger.error("bayeux: Presence service failed to record socket connection: " + err, { exception: err });

      message.ext.userId = userId;

      // if(troupeId) {
      //   recentRoomService.saveLastVisitedTroupeforUserId(userId, troupeId);
      // }

      // If the troupeId was included, it means we've got a native
      // client and they'll be looking for a snapshot:
      contextGenerator.generateSocketContext(userId, troupeId, function(err, context) {
        if(err) logger.error("bayeux: Unable to generate context: " + err, { exception: err });

        message.ext.context = context;

        // Not possible to throw an error here, so just carry only
        callback(message);
      });

    });

  }

};

function destroyClient(clientId) {
  if(!clientId) return;

  process.nextTick(function() {
    var engine = server._server._engine;
    engine.destroyClient(clientId, function() {
      logger.info('bayeux: client ' + clientId + ' intentionally destroyed.');
    });

  });

}

//
// Authorisation Extension - decides whether the user
// is allowed to connect to the subscription channel
//
var authorisor = {
  incoming: function(message, req, callback) {
    if(message.channel != '/meta/subscribe') {
      return callback(message);
    }

    var snapshot = 1;
    if(message.ext && message.ext.snapshot === false) {
      snapshot = 0;
    }

    function deny(errorCode) {
      stats.eventHF('bayeux.subscribe.deny');
      var errorDescription;
      switch(errorCode) {
        case 401: errorDescription = 'Access denied'; break;
        case 403: errorDescription = 'Permission denied'; break;
        case 404: errorDescription = 'Not found'; break;
        default:
          errorDescription = 'A server error occurred';
      }

      message.error = errorCode + '::' + errorDescription;
      logger.error('Socket authorisation failed. Denying subscribe.', message);

      callback(message);
    }


    // Do we allow this user to connect to the requested channel?
    this.authorizeSubscribe(message, function(err, allowed) {
      if(err) {
        var status = err.status || 500;

        logger.error("bayeux: Authorisation error", { exception: err, message: message });
        return deny(status, "A server error occurred.");
      }

      if(!allowed) {
        logger.warn("bayeux: Authorisation failed", { message: message });
        return deny(403, "Authorisation denied.");
      }

      message.id = [message.id || '', snapshot].join(':');

      return callback(message);
    });

  },

  outgoing: function(message, req, callback) {
    if(message.channel != '/meta/subscribe') {
      return callback(message);
    }

    if(message.error) {
      return callback(message);
    }

    var match = null;

    var hasMatch = routes.some(function(route) {
      var m = route.re.exec(message.subscription);
      if(m) {
        match = { route: route, match: m };
      }
      return m;
    });

    if(!hasMatch) {
      return callback(message);
    }

    var populator = match.route.populator;
    var m = match.match;
    var clientId = message.clientId;

    var parts = message.id && message.id.split(':');
    if(!parts || parts.length !== 2) return callback(message);

    message.id = parts[0] || undefined;
    var snapshot = parseInt(parts[1], 10) === 1;

    /* The populator is all about generating the snapshot for the client */
    if(clientId && populator && snapshot) {
      presenceService.lookupUserIdForSocket(clientId, function(err, userId, exists) {
        if(err) {
          logger.error('Error for lookupUserIdForSocket', { exception: err });
          return callback(message);
        }

        if(!exists) {
          logger.warn('Populator failed as socket ' + clientId + ' does not exist');
          return callback(message);
        }

        populator({ userId: userId, match: m }, function(err, data) {
          var e = message.ext;
          if(!e) {
            e = {};
            message.ext = e;
          }
          e.snapshot = data;
          return callback(message);
        });

      });
    } else {
      return callback(message);
    }
  },

  // Authorize a sbscription message
  // callback(err, allowAccess)
  authorizeSubscribe: function(message, callback) {
    if(messageIsFromSuperClient(message)) {
      return callback(null, true);
    }

    var clientId = message.clientId;

    if(!clientId) return callback(new StatusError(401, 'Cannot authorise. Client not authenticated'));

    presenceService.lookupUserIdForSocket(clientId, function(err, userId, exists) {
      if(err) return callback(err);

      if(!exists) return callback(new StatusError(401, 'Cannot authorise. Socket does not exist.'));

      var match = null;

      var hasMatch = routes.some(function(route) {
        var m = route.re.exec(message.subscription);
        if(m) {
          match = { route: route, match: m };
        }
        return m;
      });

      if(!hasMatch) return callback(new StatusError(404, "Unknown subscription. Cannot validate"));

      var validator = match.route.validator;
      var m = match.match;

      validator({ userId: userId, match: m, message: message, clientId: clientId }, callback);
    });

  }
};

var noConnectForUnknownClients = {
  incoming: function(message, req, callback) {

    function deny(errorCode, errorDescription) {
      stats.eventHF('bayeux.connect.deny');

      var referer = req && req.headers && req.headers.referer;
      var origin = req && req.headers && req.headers.origin;
      var connection = req && req.headers && req.headers.connection;
      var reason = message.data && message.data.reason;

      message.error = errorCode + '::' + errorDescription;
      logger.error('Denying connect access: ' + errorDescription, {
        errorCode: errorCode,
        clientId: clientId,
        referer: referer,
        origin: origin,
        connection: connection,
        pingReason: reason });

      callback(message);
    }

    if (message.channel != '/meta/connect') return callback(message);

    if(messageIsFromSuperClient(message)) {
      return callback(message);
    }

    var clientId = message.clientId;

    if(!clientId) {
      return deny(401, "Access denied. ClientId required.");
    }

    server._server._engine.clientExists(clientId, function(exists) {
      if(!exists) {
        return deny(401, "Client does not exist");
      }

      presenceService.socketExists(clientId, function(err, exists) {
        if(err) {
          logger.error("presenceService.socketExists failed: " + err, { exception: err });
          return deny(500, "A server error occurred.");
        }

        if(!exists) return deny(401, "Socket association does not exist");

        return callback(message);
      });

    });

  }
};

var pushOnlyServer = {
  incoming: function(message, callback) {
    if (message.channel.match(/^\/meta\//)) {
      return callback(message);
    }

    // Only ping if data is {}
    if (message.channel == '/api/v1/ping2' && Object.keys(message.data).length < 2) {
      return callback(message);
    }

    if(messageIsFromSuperClient(message)) {
      return callback(message);
    }

    message.error = '403::Push access denied';
    callback(message);
  },

  outgoing: function(message, callback) {
    if (message.ext) delete message.ext.password;
    callback(message);
  }
};

var pingResponder = {
  incoming: function(message, req, callback) {
    // Only ping if data is {}
    if (message.channel != '/api/v1/ping2') {
      return callback(message);
    }

    function deny(errorCode, errorDescription) {
      stats.eventHF('bayeux.ping.deny');

      var referer = req && req.headers && req.headers.referer;
      var origin = req && req.headers && req.headers.origin;
      var connection = req && req.headers && req.headers.connection;
      var reason = message.data && message.data.reason;

      message.error = errorCode + '::' + errorDescription;
      logger.error('Denying ping access: ' + errorDescription, {
        errorCode: errorCode,
        clientId: clientId,
        referer: referer,
        origin: origin,
        connection: connection,
        pingReason: reason });

      callback(message);
    }

    var clientId = message.clientId;

    if(!clientId) {
      return deny(401, "Access denied. ClientId required.");
    }

    server._server._engine.clientExists(clientId, function(exists) {
      if(!exists) {
        return deny(401, "Client does not exist");
      }

      presenceService.socketExists(clientId, function(err, exists) {
        if(err) {
          logger.error("presenceService.socketExists failed: " + err, { exception: err });
          return deny(500, "A server error occurred.");
        }

        if(!exists) return deny(401, "Socket association does not exist");

        return callback(message);
      });

    });


  }
};

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

        if(message.clientId) {
          logger.info('Destroying client', { clientId: message.clientId });
          // We've told the person to go away, destroy their faye client
          destroyClient(message.clientId);
        }

        if(message.channel === '/meta/handshake') {
          // Handshake failing, go away
          reconnect = 'none';
        } else {
          // Rehandshake
          reconnect = 'handshake';
        }

        message.advice = {
          reconnect: reconnect,
          interval:  1000
        };
      }

      logger.info('Bayeux error', message);
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

faye.stringify = function(object) {
  var string = JSON.stringify(object);
  stats.gaugeHF('bayeux.message.size', string.length);
  return string;
};

faye.logger = {
  debug: function(msg) {
    if(msg.indexOf('[Faye.Engine] Queueing for client') === 0) {
      logger.verbose('faye: ' + msg);
    }
  },
  info: function(msg) {
    if(msg.indexOf('[Faye.Engine]') === 0) {
      logger.info('faye: ' + msg);
    }
  }
};

var logLevels = ['fatal', 'error', 'warn'];
logLevels/*.slice(0, 1 + logLevel)*/.forEach(function(level) {
  faye.logger[level] = function(msg) { logger[level]('faye: ' + msg); };
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
    server.addExtension(pingResponder);
    server.addExtension(adviseAdjuster);

    client.addExtension(superClient);

    ['connection:open', 'connection:close'].forEach(function(event) {
      server._server._engine.bind(event, function(clientId) {
        logger.info("faye-engine: Client " + clientId + ": " + event);
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

