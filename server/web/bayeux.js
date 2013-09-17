/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

//var faye = require('faye');
var faye              = require('./faye-temp/faye-node');
var fayeRedis         = require('faye-redis');
var oauth             = require("../services/oauth-service");
var winston           = require("winston");
var troupeService     = require("../services/troupe-service");
var presenceService   = require("../services/presence-service");
var restful           = require("../services/restful");
var nconf             = require("../utils/config");
var shutdown          = require('../utils/shutdown');
var contextGenerator  = require('./context-generator');
var appVersion        = require('./appVersion');
var userService       = require("../services/user-service");
var Q                 = require('q');

var appTag = appVersion.getAppTag();

// Strategies for authenticating that a user can subscribe to the given URL
var routes = [
  { re: /^\/troupes\/(\w+)$/,         validator: validateUserForTroupeSubscription },
  { re: /^\/troupes\/(\w+)\/(\w+)$/,  validator: validateUserForSubTroupeSubscription,  populator: populateSubTroupeCollection},
  { re: /^\/user\/(\w+)\/(\w+)$/,     validator: validateUserForUserSubscription,       populator: populateSubUserCollection },
  { re: /^\/user\/(\w+)\/troupes\/(\w+)\/unreadItems$/,
                                      validator: validateUserForUserSubscription,       populator: populateUserUnreadItemsCollection },
  { re: /^\/user\/(\w+)$/,            validator: validateUserForUserSubscription },
  { re: /^\/ping$/,                   validator: validateUserForPingSubscription }
];

var superClientPassword = nconf.get('ws:superClientPassword');

// This strategy ensures that a user can access a given troupe URL
function validateUserForTroupeSubscription(options, callback) {
  options.notifyPresenceService = true;
  options.updateLastVisitedTroupe = true;
  validateUserForSubTroupeSubscription(options, callback);
}

// This strategy ensures that a user can access a URL under a troupe URL
function validateUserForSubTroupeSubscription(options, callback) {
  var userId = options.userId;
  var match = options.match;
  var message = options.message;
  var clientId = options.clientId;
  var notifyPresenceService = options.notifyPresenceService;

  var troupeId = match[1];
  return troupeService.findById(troupeId)
    .then(function(troupe) {
      if(!troupe) return false;
      var result = troupeService.userIdHasAccessToTroupe(userId, troupe);

      if(!result) {
        winston.info("Denied user " + userId + " access to troupe " + troupe.uri);
        return false;
      }

      if(notifyPresenceService) {
        var eyeballState = true;
        if(message.ext && 'eyeballs' in message.ext) {
          eyeballState = !!message.ext.eyeballs;
        }

        var userSubscribedToTroupe = Q.denodeify(presenceService.userSubscribedToTroupe);
        return userSubscribedToTroupe(userId, troupeId, clientId, eyeballState);
      }

      return result;
    })
    .nodeify(callback);
}

// This strategy ensures that a user can access a URL under a /user/ URL
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

    case "invites":
      return restful.serializeInvitesForUser(userId, callback);

    case "connectioninvites":
      return restful.serializeInvitesFromUser(userId, callback);

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
    case "requests":
      return restful.serializeRequestsForTroupe(troupeId, userId, callback);

    case "chatMessages":
      return restful.serializeChatsForTroupe(troupeId, userId, callback);

    case "files":
      return restful.serializeFilesForTroupe(troupeId, userId, callback);

    case "conversations":
      return restful.serializeConversationsForTroupe(troupeId, userId, callback);

    case "users":
      return restful.serializeUsersForTroupe(troupeId, userId, callback);

    case "invites":
      return restful.serializeInvitesForTroupe(troupeId, userId, callback);

    default:
      winston.error('Unable to provide snapshot for ' + collection);
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

    winston.info('bayeux: Handshake: ', message);

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

      // This is an UGLY UGLY hack, but it's the only
      // way possible to pass the userId to the outgoing extension
      // where we have the clientId (but not the userId)
      var id = message.id || '';
      message.id = id + ':' + userId + ':' + connectionType + ':' + client + ':' + troupeId;

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

    if(parts.length != 5) {
      return callback(message);
    }

    message.id = parts[0] || undefined; // id not required for an incoming message
    var userId = parts[1];
    var connectionType = parts[2];
    var clientId = message.clientId;
    var client = parts[3];
    var troupeId = parts[4];

    // Get the presence service involved around about now
    presenceService.userSocketConnected(userId, clientId, connectionType, client, function(err) {
      if(err) winston.error("bayeux: Presence service failed to record socket connection: " + err, { exception: err });

      message.ext.userId = userId;

      if(!troupeId) return callback(message);

      userService.saveLastVisitedTroupeforUserId(userId, troupeId);

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
      message.error = '403::Access denied';
      winston.error('Socket authorisation failed', message);
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
        winston.warn('bayeux: client not authenticated. Failing authorisation', { clientId: clientId });
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

var subscriptionTimestamp = {
  outgoing: function(message, callback) {
    if (message.channel === '/meta/subscribe') {
      message.timestamp = new Date().toISOString();
    }

    callback(message);
  }
};

var pushOnlyServer = {
  incoming: function(message, callback) {
    if (message.channel.match(/^\/meta\//)) {
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

var superClient = {
  outgoing: function(message, callback) {
    message.ext = message.ext || {};
    message.ext.password = superClientPassword;
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
  attach: function(httpServer) {

    // Attach event handlers
    server.addExtension(authenticator);
    server.addExtension(authorisor);
    server.addExtension(pushOnlyServer);
    server.addExtension(subscriptionTimestamp);

    client.addExtension(superClient);

    //server.bind('handshake', function(clientId) {
    //  winston.verbose("Faye handshake: ", { clientId: clientId });
    //});

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

