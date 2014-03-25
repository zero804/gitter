/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var faye              = require('faye');
var fayeRedis         = require('faye-redis');
var winston           = require('../utils/winston');
var oauth             = require('../services/oauth-service');
var troupeService     = require('../services/troupe-service');
var presenceService   = require('../services/presence-service');
var restful           = require('../services/restful');
var nconf             = require('../utils/config');
var shutdown          = require('../utils/shutdown');
var contextGenerator  = require('./context-generator');
var appVersion        = require('./appVersion');
var recentRoomService = require('../services/recent-room-service');
var statsService      = require('../services/stats-service');

var appTag = appVersion.getAppTag();

// Strategies for authenticating that a user can subscribe to the given URL
var routes = [
  { re: /^\/api\/v1\/troupes\/(\w+)$/,
    validator: validateUserForTroupeSubscription },
  { re: /^\/api\/v1\/troupes\/(\w+)\/(\w+)$/,
    validator: validateUserForSubTroupeSubscription,
    populator: populateSubTroupeCollection },
  { re: /^\/api\/v1\/troupes\/(\w+)\/(\w+)\/(\w+)\/(\w+)$/,
    validator: validateUserForSubTroupeSubscription,
    populator: populateSubSubTroupeCollection },
  { re: /^\/api\/v1\/user\/(\w+)\/(\w+)$/,
    validator: validateUserForUserSubscription,
    populator: populateSubUserCollection },
  { re: /^\/api\/v1\/user\/(\w+)\/troupes\/(\w+)\/unreadItems$/,
    validator: validateUserForUserSubscription,
    populator: populateUserUnreadItemsCollection },
  { re: /^\/api\/v1\/user\/(\w+)$/,
    validator: validateUserForUserSubscription },
  { re: /^\/api\/v1\/ping(\/\w+)?$/,
    validator: validateUserForPingSubscription }
];

var superClientPassword = nconf.get('ws:superClientPassword');

// This strategy ensures that a user can access a given troupe URL
function validateUserForTroupeSubscription(options, callback) {
  validateUserForSubTroupeSubscription(options, callback);
}

// This strategy ensures that a user can access a URL under a troupe URL
function validateUserForSubTroupeSubscription(options, callback) {
  var userId = options.userId;
  var match = options.match;

  var troupeId = match[1];
  return troupeService.findById(troupeId)
    .then(function(troupe) {
      if(!troupe) return false;
      var result = troupeService.userIdHasAccessToTroupe(userId, troupe);

      if(!result) {
        winston.info("Denied user " + userId + " access to troupe " + troupe.uri);
        return false;
      }

      return result;
    })
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

  var result = userId == subscribeUserId;

  return callback(null, result);
}

function populateSubUserCollection(options, callback) {
  var userId = options.userId;
  var match = options.match;
  var subscribeUserId = match[1];
  var collection = match[2];

  if(userId != subscribeUserId) {
    return callback(null, [ ]);
  }

  switch(collection) {
    case "troupes":
      return restful.serializeTroupesForUser(userId, callback);

    default:
      winston.error('Unable to provide snapshot for ' + collection);
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
      winston.error('Unable to provide snapshot for ' + collection);
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
    function deny() {
      statsService.eventHF('bayeux.handshake.deny');

      message.error = '403::Access denied';
      winston.error('Denying client access', message);
      callback(message);
    }

    if (message.channel != '/meta/handshake') {
      return callback(message);
    }

    if(messageIsFromSuperClient(message)) {
      return callback(message);
    }

    var ext = message.ext;

    if(!ext || !ext.token) {
      return deny();
    }

    oauth.validateToken(ext.token, function(err, userId) {
      if(err) {
        winston.error("bayeux: Authentication error" + err, { exception: err, message: message });
        return deny();
       }

      if(!userId) {
        winston.warn("bayeux: Authentication failed", { message: message });
        return deny();
      }

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
    var userId = parts[1];
    var connectionType = parts[2];
    var clientId = message.clientId;
    var client = parts[3];
    var troupeId = parts[4] || undefined;
    var eyeballState = parseInt(parts[5], 10) || 0;

    // Get the presence service involved around about now
    presenceService.userSocketConnected(userId, clientId, connectionType, client, troupeId, eyeballState, function(err) {
      if(err) winston.error("bayeux: Presence service failed to record socket connection: " + err, { exception: err });

      message.ext.userId = userId;

      if(troupeId) {
        recentRoomService.saveLastVisitedTroupeforUserId(userId, troupeId);
      }

      // If the troupeId was included, it means we've got a native
      // client and they'll be looking for a snapshot:
      contextGenerator.generateSocketContext(userId, troupeId, function(err, context) {
        if(err) winston.error("bayeux: Unable to generate context: " + err, { exception: err });

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
      winston.info('bayeux: client ' + clientId + ' destroyed');
    });

  });

}
//
// Authorisation Extension - decides whether the user
// is allowed to connect to the subscription channel
//
var authorisor = {
  incoming: function(message, callback) {
    if(message.channel != '/meta/subscribe') {
      return callback(message);
    }

    function deny() {
      statsService.eventHF('bayeux.subscribe.deny');

      message.error = '403::Access denied';
      winston.error('Socket authorisation failed. Disconnecting client.', message);

      destroyClient(message.clientId);
      callback(message);
    }

    // Do we allow this user to connect to the requested channel?
    this.authorizeSubscribe(message, function(err, allowed) {
      if(err) {
        winston.error("bayeux: Authorisation error", { exception: err, message: message });
        return deny();
      }

      if(!allowed) {
        winston.warn("bayeux: Authorisation failed", { message: message });
        return deny();
      }

      return callback(message);
    });

  },

  outgoing: function(message, callback) {
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

    /* The populator is all about generating the snapshot for the client */
    if(clientId && populator) {
      presenceService.lookupUserIdForSocket(clientId, function(err, userId) {
        if(err) {
          winston.error('Error for lookupUserIdForSocket', { exception: err });
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

    presenceService.lookupUserIdForSocket(clientId, function(err, userId) {
      if(err) return callback(err);

      if(!userId) {
        winston.warn('bayeux: client not authenticated.', { clientId: clientId });
        return callback();
      }

      var match = null;

      var hasMatch = routes.some(function(route) {
        var m = route.re.exec(message.subscription);
        if(m) {
          match = { route: route, match: m };
        }
        return m;
      });

      if(!hasMatch) return callback("Unknown subscription. Cannot validate");

      var validator = match.route.validator;
      var m = match.match;

      validator({ userId: userId, match: m, message: message, clientId: clientId }, callback);
    });

  }
};

var pushOnlyServer = {
  incoming: function(message, callback) {
    if (message.channel.match(/^\/meta\//)) {
      return callback(message);
    }

    // Only ping if data is {}
    if (message.channel == '/api/v1/ping2' && Object.keys(message.data).length === 0) {
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

    function deny(err) {
      statsService.eventHF('bayeux.ping.deny');
      var referer = req && req.headers && req.headers.referer;
      var origin = req && req.headers && req.headers.origin;
      var connection = req && req.headers && req.headers.connection;

      message.error = '403::Access denied';
      winston.error('Denying ping access: ' + err, { referer: referer, origin: origin, connection: connection });

      callback(message);
    }

    var clientId = message.clientId;

    if(!clientId) {
      return deny("Client does not exist, clientId=null");
    }

    server._server._engine.clientExists(clientId, function(exists) {
      if(!exists) {
        return deny("Client does not exist, clientId=" + clientId);
      }

      presenceService.lookupUserIdForSocket(clientId, function(err, userId) {
        if(err) return deny(err);

        if(!userId) {
          destroyClient(message.clientId);
          return deny("Client not authenticated. Denying ping. ", { clientId: clientId });
        }

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
        statsService.eventHF('bayeux.handshake');

        /* Rate is for the last full 10s period */
        var connType = message.ext && message.ext.connType;
        var handshakeRate = message.ext && message.ext.rate;
        winston.verbose("bayeux: " + message.channel , { ip: getClientIp(req), connType: connType, rate: handshakeRate });
        break;

      case '/meta/connect':
        statsService.eventHF('bayeux.connect');

        /* Rate is for the last full 10s period */
        var connectRate = message.ext && message.ext.rate;
        if(connectRate && connectRate > 1) {
          winston.verbose("bayeux: connect" , { ip: getClientIp(req), clientId: message.clientId, rate: connectRate });
        }
        break;

      case '/meta/subscribe':
        statsService.eventHF('bayeux.subscribe');

        winston.verbose("bayeux: subscribe", { clientId: message.clientId, subs: message.subscription });
        break;
    }

    callback(message);
  },

  outgoing: function(message, req, callback) {
    if(message.channel === '/meta/handshake' ) {
      var ip = getClientIp(req);
      var clientId = message.clientId;
      winston.verbose("bayeux: handshake complete", { ip: ip, clientId: clientId });
    }
    callback(message);
  }
};

var adviseAdjuster = {
  outgoing: function(message, req, callback) {
    if(message.error && message.error.indexOf("403") === 0) {
      if(!message.advice) {
        message.advice = {};
      }

      if(message.channel == '/meta/handshake') {
        // If we're unable to handshake, the situation is dire
        message.advice.reconnect = 'none';
      } else {
        message.advice.reconnect = 'handshake';
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
    host: nconf.get("redis:host"),
    port: nconf.get("redis:port"),
    database: nconf.get("redis:redisDb"),
    interval: nconf.get('ws:fayeInterval'),
    namespace: 'fr:'
  }
});

var client = server.getClient();

//faye.Logging.logLevel = 'info';

module.exports = {
  server: server,
  engine: server._server._engine,
  client: client,
  destroyClient: destroyClient,
  attach: function(httpServer) {

    // Attach event handlers
    server.addExtension(logging);
    server.addExtension(authenticator);
    server.addExtension(authorisor);
    server.addExtension(pushOnlyServer);
    server.addExtension(pingResponder);
    server.addExtension(adviseAdjuster);


    client.addExtension(superClient);


    /** Some logging */
    ['handshake', 'disconnect'].forEach(function(event) {
      server.bind(event, function(clientId) {
        winston.info("Client " + clientId + ": " + event);
      });
    });



    server.bind('disconnect', function(clientId) {
      // Warning, this event is called simulateously on
      // all the servers that are connected to the same redis/faye
      // connection
      winston.info("Client " + clientId + " disconnected");
      presenceService.socketDisconnected(clientId, function(err) {
        if(err && err !== 404) { winston.error("bayeux: Error while attempting disconnection of socket " + clientId + ": " + err,  { exception: err }); }
      });
    });

    shutdown.addHandler('bayeux', 15, function(callback) {
      var engine = server._server._engine;
      engine.disconnect();
      setTimeout(callback, 1000);
    });

    presenceService.startPresenceGcService(server._server._engine);
    server.attach(httpServer);
  }
};

