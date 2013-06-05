/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var faye = require('faye');
var fayeRedis = require('faye-redis');
var oauth = require("../services/oauth-service");
var winston = require("winston");
var troupeService = require("../services/troupe-service");
var presenceService = require("../services/presence-service");
var nconf = require("../utils/config");
var shutdown = require('../utils/shutdown');

// Strategies for authenticating that a user can subscribe to the given URL
var routes = [
  { re: /^\/troupes\/(\w+)$/, validator: validateUserForTroupeSubscription },
  { re: /^\/troupes\/(\w+)\/(.+)$/, validator: validateUserForSubTroupeSubscription },
  { re: /^\/user\/(\w+)\/(.+)$/, validator: validateUserForUserSubscription },
  { re: /^\/user\/(\w+)$/, validator: validateUserForUserSubscription },
  { re: /^\/ping$/, validator: validateUserForPingSubscription }

];

var superClientPassword = nconf.get('ws:superClientPassword');

// This strategy ensures that a user can access a given troupe URL
function validateUserForTroupeSubscription(options, callback) {
  options.notifyPresenceService = true;
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
  troupeService.findById(troupeId, function onTroupeFindByIdComplete(err, troupe) {
    if(err || !troupe) return callback(err, !!troupe);

    var result = troupeService.userIdHasAccessToTroupe(userId, troupe);

    if(!result) {
      winston.info("Denied user " + userId + " access to troupe " + troupe.uri);
    }

    if(result && notifyPresenceService) {
      var eyeballState = true;
      if(message.ext) {
        if(message.ext.hasOwnProperty('eyeballs')) {
          eyeballState = !!message.ext.eyeballs;
        }
      }

      presenceService.userSubscribedToTroupe(userId, troupeId, clientId, eyeballState, function(err) {
        if(err) return callback(err);

        return callback(null, result);
      });

    } else {
      // No need to tell the presence service
      return callback(null, result);
    }

  });
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

function messageIsFromSuperClient(message) {
  return message &&
         message.ext &&
         message.ext.password === superClientPassword;
}

// This needs to be removed once all old FayeObjC clients that don't send ext on handshakre are dead and gone
// DELETE THIS CODE
var HANDLE_TEMPORARY_FAYEOBJ_SITUATION = false;

function handleTemporarySituationWhereFayeObjCDoesntSendExtOnHandshake(message, callback) {
  var clientId = message.clientId;
  function deny() {
    message.error = '403::Access denied';
    callback(message);
  }

  presenceService.lookupUserIdForSocket(clientId, function(err, userId) {
    if(err) {
      winston.error("bayeux: handleTemporarySituationWhereFayeObjCDoesntSendExtOnHandshake: lookupUserIdForSocket error" + err, { exception: err, message: message });
      return deny();
    }

    if(userId) return callback(message);

    // We're not authed, try now
    if(messageIsFromSuperClient(message)) {
      return callback(message);
    }

    var ext = message.ext;
    if(!ext) return deny();

    var accessToken = ext.token;
    if(!accessToken) return deny();

    oauth.validateToken(accessToken, function(err, userId) {
      if(err) {
        winston.error("bayeux: Authentication error" + err, { exception: err, message: message });
        return deny();
       }

      if(!userId) {
        winston.warn("bayeux: Authentication failed", { message: message });
        return deny();
      }

      // Get the presence service involved around about now
      presenceService.userSocketConnected(userId, clientId, 'online', function(err) {
        if(err) winston.error("bayeux: Presence service failed to record socket connection: " + err, { exception: err });
        callback(message);
      });

    });
  });
}

function getConnectionType(incoming) {
  if(!incoming) return 'online';

  switch(incoming) {
    case 'web': return 'online';
    case 'mobile': return 'mobile';

    default:
      return 'online';
  }
}

var authenticator = {
  incoming: function(message, callback) {
    function deny() {
      message.error = '403::Access denied';
      callback(message);
    }

    // TEMP TEMP TEMP
    if(HANDLE_TEMPORARY_FAYEOBJ_SITUATION) {
      if (message.channel == '/meta/subscribe') {
        return handleTemporarySituationWhereFayeObjCDoesntSendExtOnHandshake(message, callback);
      }
    }
    // END TEMP TEMP TEMP

    if (message.channel != '/meta/handshake') {
      return callback(message);
    }

    if(messageIsFromSuperClient(message)) {
      return callback(message);
    }

    var ext = message.ext;

    if(!ext || !ext.token) {
      if(HANDLE_TEMPORARY_FAYEOBJ_SITUATION) {
        winston.verbose('bayeux: Allowing temporary access to unauthorised handshake client');
        // Currently the faye connection code doesn't send the ext in the handshake message
        // see handleTemporarySituationWhereFayeObjCDoesntSendExtOnHandshake
        return callback(message);
      } else {
        return deny();
      }
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

      // This is an UGLY UGLY hack, but it's the only
      // way possible to pass the userId to the outgoing extension
      // where we have the clientId (but not the userId)
      message.id = message.id + ':' + userId + ':' + connectionType;

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

    // The other half of the UGLY hack,
    // get the userId out from the message
    var fakeId = message.id;
    if(!fakeId) {
      return callback(message);
    }

    var parts = fakeId.split(':');

    if(parts.length != 3) {
      return callback(message);
    }

    message.id = parts[0];
    var userId = parts[1];
    var connectionType = parts[3];
    var clientId = message.clientId;

    // Get the presence service involved around about now
    presenceService.userSocketConnected(userId, clientId, connectionType, function(err) {
      if(err) winston.error("bayeux: Presence service failed to record socket connection: " + err, { exception: err });

      // Not possible to throw an error here, so just carry only
      callback(message);
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
      // Warning, this event is called pretty simulateously on
      // all the servers that are connected to the same redis/faye
      // connection
      winston.info("Client " + clientId + " disconnected");
      presenceService.socketDisconnected(clientId, function(err) {
        if(err && !err.lockFail) { winston.error("bayeux: Error while attempting disconnection of socket " + clientId + ": " + err,  { exception: err }); }
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

