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
//var RedisClientUserLookupStrategy = require('./bayeux-user-lookup').RedisClientUserLookupStrategy;

// Strategies for authenticating that a user can subscribe to the given URL
var routes = [
  { re: /^\/troupes\/(\w+)$/, validator: validateUserForTroupeSubscription },
  { re: /^\/troupes\/(\w+)\/(.+)$/, validator: validateUserForSubTroupeSubscription },
  { re: /^\/user\/(\w+)\/(.+)$/, validator: validateUserForUserSubscription },
  { re: /^\/user\/(\w+)$/, validator: validateUserForUserSubscription }
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
      presenceService.userSubscribedToTroupe(userId, troupeId, clientId, function(err) {
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
function validateUserForUserSubscription(options, callback) {
  var userId = options.userId;
  var match = options.match;
  var subscribeUserId = match[1];

  var result = userId == subscribeUserId;

  return callback(null, result);
}


//var clientUserLookup = new RedisClientUserLookupStrategy();

//
// Auth Extension:authenticate all subscriptions to ensure that the user has access
// to the given url
//
var auth = {
  incoming: function(message, callback) {
    if (message.channel === '/meta/subscribe') {
      this.authorized(message, function(err, allowed) {
        if(err) winston.error("Error authorizing message ", { exception: err });
        if(!allowed) { winston.warn("Client denied access to channel ", { message: message }); }
        if(err || !allowed) {
          //message.subscription = "/invalid";
          message.error = '403::Access denied';
        }
        callback(message);
      });

    } else {
      callback(message);
    }

  },

  isSuperClient: function(message) {
    return message && message.ext && message.ext.password === superClientPassword;
  },

  // Authorize a sbscription message
  authorized: function(message, callback) {
    var clientId = message.clientId;
    if(!clientId) return callback("Message has no clientId. Will not proceed.");

    if(this.isSuperClient(message)) {
      return callback(null, true);
    }

    this.lookupClient(message, function onLookupClientDone(err, userId) {
      if(err) return callback("Validation failed: " + err);
      if(!userId) return callback("Invalid access token");

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

      validator({ userId: userId, match: m, message: message, clientId: clientId }, function onValidatorFinished(err, result) {
        return callback(err, result);
      });


    });
  },

  // Use the message
  lookupClient: function(message, callback) {
    var ext = message.ext;
    if(!ext) return callback("No auth provided");

    var clientId = message.clientId;

    presenceService.lookupUserIdForSocket(clientId, function onLookupUserIdForClientIdDone(err, userId) {
      if(err) return callback(err);
      if(userId) return callback(null, userId);

      var accessToken = ext.token;
      if(!accessToken) return callback("No auth provided");

      oauth.validateToken(accessToken, function(err, userId) {
        if(err) return callback(err);
        if(!userId) return callback("Invalid access token");

        userId = "" + userId;

        // Get the presence service involved around about now
        presenceService.userSocketConnected(userId, clientId, function() {
          if(err) return callback(err);
          return callback(null, userId);

        });

    });
    });
  }
};

var pushOnlyServer = {
  incoming: function(message, callback) {
    if (!message.channel.match(/^\/meta\//)) {
      var password = message.ext && message.ext.password;
      if (password !== superClientPassword)
        message.error = '403::Password required';
    }
    callback(message);
  },

  outgoing: function(message, callback) {
    if (message.ext) delete message.ext.password;
    callback(message);
  }
};

var pushOnlyServerClient = {
  outgoing: function(message, callback) {
    message.ext = message.ext || {};
    message.ext.password = superClientPassword;
    callback(message);
  }
};

var server = new faye.NodeAdapter({
  mount: '/faye',
  timeout: 120,
  engine: {
    type: fayeRedis,
    host: nconf.get("redis:host"),
    port: nconf.get("redis:port"),
    ping: 30,
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
    server.addExtension(auth);
    server.addExtension(pushOnlyServer);
    client.addExtension(pushOnlyServerClient);

    server.bind('handshake', function(clientId) {
     winston.debug("Faye handshake: ", { clientId: clientId });
    });

    server.bind('disconnect', function(clientId) {
      winston.info("Client " + clientId + " disconnected");
      presenceService.socketDisconnected(clientId, { immediate: false });
    });

    shutdown.addHandler('bayeux', 15, function(callback) {
      var engine = server._server._engine;
      engine.disconnect();
      setTimeout(callback, 1000);
    });


    presenceService.validateActiveSockets(server._server._engine);
    server.attach(httpServer);
  }
};

