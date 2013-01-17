
/*jshint globalstrict:true unused:true node:true */
"use strict";

var faye = require('faye');
var oauth = require("../services/oauth-service");
var winston = require("winston");
var troupeService = require("../services/troupe-service");
var presenceService = require("../services/presence-service");

// Strategies for authenticating that a user can subscribe to the given URL
var routes = [
  { re: /^\/troupes\/(\w+)$/, validator: validateUserForTroupeSubscription },
  { re: /^\/troupes\/(\w+)\/(\w+)$/, validator: validateUserForSubTroupeSubscription },
  { re: /^\/user\/(\w+)$/, validator: validateUserForUserSubscription }
];

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

    if(notifyPresenceService) {
      presenceService.userSubscribedToTroupe(userId, troupeId, clientId);
    }

    var result = troupeService.userIdHasAccessToTroupe(userId, troupe);
    return callback(null, result);
  });
}

// This strategy ensures that a user can access a URL under a troupe URL
function validateUserForUserSubscription(options, callback) {
  var userId = options.userId;
  var match = options.match;
  var subscribeUserId = match[1];

  var result = userId == subscribeUserId;

  return callback(null, result);
}

// Default strategy for matching a clientId to a userId
// Note that if the redis faye engine is used, this should match
// TODO: implement redis version
function InMemoryClientUserLookupStrategy() {
  this.memoryHash = {};
}

InMemoryClientUserLookupStrategy.prototype.associate = function(clientId, userId, callback) {
  this.memoryHash[clientId] = userId;
  return callback();
};

InMemoryClientUserLookupStrategy.prototype.disassociate = function(clientId, callback) {
  var userId = this.memoryHash[clientId];

  delete this.memoryHash[clientId];
  return callback(null, userId);
};

InMemoryClientUserLookupStrategy.prototype.lookupUserIdForClientId = function(clientId, callback) {
  var userId = this.memoryHash[clientId];
  return callback(null, userId);
};


//
// Auth Extension:authenticate all subscriptions to ensure that the user has access
// to the given url
//
var auth = {
  clientUserLookup: new InMemoryClientUserLookupStrategy(),

  incoming: function(message, callback) {
    if (message.channel === '/meta/subscribe') {
      this.authorized(message, function(err, allowed) {
        if(err || !allowed) {
          winston.error("Denying access to subscribe", { message: message, exception: err });
          message.error = '403::Access denied';
        }
        winston.info("Allowing user access to channel", { subscription: message.subscription });
      });
    }

    callback(message);
  },

  // Authorize a sbscription message
  authorized: function(message, callback) {
    var clientId = message.clientId;
    if(!clientId) return callback("Message has no clientId. Will not proceed.");

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

      validator({ userId: userId, match: m, clientId: clientId }, function onValidatorFinished(err, result) {
        return callback(err, result);
      });


    });
  },

  // Use the message
  lookupClient: function(message, callback) {
    var ext = message.ext;
    if(!ext) return callback("No auth provided");

    var self = this;
    var clientId = message.clientId;

    this.clientUserLookup.lookupUserIdForClientId(clientId, function onLookupUserIdForClientIdDone(err, userId) {
      if(err) return callback(err);
      if(userId) return callback(null, userId);

      var accessToken = ext.token;
      if(!accessToken) return callback("No auth provided");

      oauth.validateWebToken(accessToken, function(err, userId) {
        if(err) return callback(err);
        if(!userId) return callback("Invalid access token");

        self.clientUserLookup.associate(clientId, userId, function onAssociateDone(err) {
          if(err) return callback(err);

          // Get the presence service involved around about now
          presenceService.userSocketConnected(userId, clientId);

          return callback(null, userId);
        });

      });
    });
  }
};

var pushOnlyServer = {
  password: 'some long and unguessable application-specific string',
  incoming: function(message, callback) {
    if (!message.channel.match(/^\/meta\//)) {
      var password = message.ext && message.ext.password;
      if (password !== this.password)
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
  password: 'some long and unguessable application-specific string',

  outgoing: function(message, callback) {
    message.ext = message.ext || {};
    message.ext.password = this.password;
    callback(message);
  }
};

var server = new faye.NodeAdapter({ mount: '/faye', timeout: 45 });

var client = server.getClient();

server.addExtension(auth);

server.addExtension(pushOnlyServer);
client.addExtension(pushOnlyServerClient);

server.bind('disconnect', function(clientId) {
  auth.clientUserLookup.disassociate(clientId, function onDisassociateDone(err, userId) {
    if(err) { winston.error("Error disassociating user from client", { exception:  err }); return; }
    if(!userId) return;

    /* Give the user 10 seconds to log back into before reporting that they're disconnected */
    setTimeout(function(){
      presenceService.userSocketDisconnected(userId, clientId);
    }, 10000);

  });
});

module.exports = {
  server: server,
  client: client
};