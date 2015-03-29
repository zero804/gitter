/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var env               = require('../utils/env');
var logger            = env.logger;
var nconf             = env.config;
var stats             = env.stats;

var faye              = require('gitter-faye');
var fayeRedis         = require('gitter-faye-redis');
var deflate           = require('permessage-deflate');
var oauth             = require('../services/oauth-service');
var presenceService   = require('../services/presence-service');
var shutdown          = require('shutdown');
var contextGenerator  = require('./context-generator');
var appVersion        = require('./appVersion');
var StatusError       = require('statuserror');
var bayeuxExtension   = require('./bayeux/extension');
var clientUsageStats  = require('../utils/client-usage-stats');
var zlib              = require('zlib');
var version = appVersion.getVersion();

var superClientPassword = nconf.get('ws:superClientPassword');

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
  skipOnError: true,
  privateState: true,
  incoming: function(message, req, callback) {
    var ext = message.ext || {};

    var token = ext.token;

    if(!token) {
      return callback(new StatusError(401, "Access token required"));
    }

    oauth.validateAccessTokenAndClient(ext.token, function(err, tokenInfo) {
      if(err) return callback(err);

      if(!tokenInfo) {
        return callback(new StatusError(401, "Invalid access token"));
      }

      var user = tokenInfo.user;
      var oauthClient = tokenInfo.client;
      var userId = user && user.id;

      if(user && oauthClient) {
        clientUsageStats.record(user, oauthClient);
      }

      logger.silly('bayeux: handshake', {
        appVersion: ext.appVersion,
        username: user && user.username,
        client: oauthClient.name
      });

      var connectionType = getConnectionType(ext.connType);

      message._private.authenticator = {
        userId: userId,
        connectionType: connectionType,
        client: ext.client,
        troupeId: ext.troupeId,
        eyeballState: parseInt(ext.eyeballs, 10) || 0
      };

      return callback(null, message);
    });

  },

  outgoing: function(message, req, callback) {
    if(!message.ext) message.ext = {};
    message.ext.appVersion = version;

    var state = message._private && message._private.authenticator;
    if(!state) return callback(null, message);

    var userId = state.userId;
    var connectionType = state.connectionType;
    var clientId = message.clientId;
    var client = state.client;
    var troupeId = state.troupeId;
    var eyeballState = state.eyeballState;

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
      contextGenerator.generateSocketContext(userId, troupeId)
        .nodeify(function(err, context) {
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

  setImmediate(function() {
    var engine = server._server._engine;
    engine.destroyClient(clientId, function() {
      logger.info('bayeux: client ' + clientId + ' intentionally destroyed.');
    });
  });

}

// CONNECT extension
var noConnectForUnknownClients = bayeuxExtension({
  channel: '/meta/connect',
  name: 'doorman',
  failureStat: 'bayeux.connect.deny',
  skipSuperClient: true,
  skipOnError: true,
  incoming: function(message, req, callback) {
    var clientId = message.clientId;

    server._server._engine.clientExists(clientId, function(exists) {
      if(!exists) return callback(new StatusError(401, "Client does not exist"));

      presenceService.socketExists(clientId, function(err, exists) {
        if(err) return callback(err);

        if(!exists) return callback(new StatusError(401, "Socket association does not exist"));

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

    return callback(new StatusError(403, "Push access denied"));
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
      if(!exists) return callback(new StatusError(401, "Client does not exist"));

      presenceService.socketExists(clientId, function(err, exists) {
        if(err) return callback(err);

        if(!exists) return callback(new StatusError(401, "Socket association does not exist"));

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
        logger.silly("bayeux: " + message.channel , { ip: getClientIp(req), connType: connType, rate: handshakeRate });
        break;

      case '/meta/connect':
        stats.eventHF('bayeux.connect');

        /* Rate is for the last full 10s period */
        var connectRate = message.ext && message.ext.rate;
        if(connectRate && connectRate > 1) {
          logger.silly("bayeux: connect" , { ip: getClientIp(req), clientId: message.clientId, rate: connectRate });
        }
        break;

      case '/meta/subscribe':
        stats.eventHF('bayeux.subscribe');

        logger.silly("bayeux: subscribe", { clientId: message.clientId, subs: message.subscription });
        break;
    }

    callback(message);
  },

  outgoing: function(message, req, callback) {
    if(message.channel === '/meta/handshake' ) {
      var ip = getClientIp(req);
      var clientId = message.clientId;
      logger.silly("bayeux: handshake complete", { ip: ip, clientId: clientId });
    }
    callback(message);
  }
};

var adviseAdjuster = {
  outgoing: function(message, req, callback) {
    delete message._private;

    var error = message.error;

    if(error) {
      var errorCode = error.split(/::/)[0];
      if(errorCode) errorCode = parseInt(errorCode, 10);

      if(errorCode === 401) {
        var reconnect;

        // Consider whether to put this back....
        //
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
  mount: '/faye_transition',
  timeout: nconf.get('ws:fayeTimeout'),
  ping: nconf.get('ws:fayePing'),
  engine: {
    type: fayeRedis,
    client: env.redis.getClient(),
    subscriberClient: env.redis.createClient(), // Subscribe. Needs new client
    interval: nconf.get('ws:fayeInterval'),
    includeSequence: true,
    namespace: 'fr:',
    statsDelegate: function(category, event) {
      stats.eventHF('bayeux.' + category + '.' + event, 1);
    }
  }
});

if(nconf.get('ws:fayePerMessageDeflate')) {
  /* Add permessage-deflate extension to Faye */
  deflate = deflate.configure({
    level: zlib.Z_BEST_SPEED
  });
  server.addWebsocketExtension(deflate);
}

/* Nasty hack, but no way around it */
server._server._makeResponse = function(message) {
  var response = {};

  if (message.id)       response.id       = message.id;
  if (message.clientId) response.clientId = message.clientId;
  if (message.channel)  response.channel  = message.channel;
  if (message.error)    response.error    = message.error;

  // Our improvement: information for extensions
  if (message._private) response._private = message._private;

  response.successful = !response.error;
  return response;
};

var client = server.getClient();

module.exports = {
  server: server,
  engine: server._server._engine,
  client: client,
  destroyClient: destroyClient,
  attach: function() {

    // Attach event handlers
    server.addExtension(logging);
    server.addExtension(authenticator);
    server.addExtension(noConnectForUnknownClients);

    //
    // Authorisation Extension - decides whether the user
    // is allowed to connect to the subscription channel
    //
    server.addExtension(require('./bayeux/authorisor'));

    server.addExtension(pushOnlyServer);
    server.addExtension(hidePassword);
    server.addExtension(pingResponder);
    server.addExtension(adviseAdjuster);

    client.addExtension(superClient);

    server.bind('disconnect', function(clientId) {
      // Warning, this event is called simulateously on
      // all the servers that are connected to the same redis/faye
      // connection
      presenceService.socketDisconnected(clientId, function(err) {
        if(err && err.status !== 404) {
          logger.error("bayeux: Error while attempting disconnection of socket " + clientId + ": " + err,  { exception: err });
        }
      });
    });

    shutdown.addHandler('bayeux', 15, function(callback) {
      var engine = server._server._engine;
      engine.disconnect();
      setTimeout(callback, 1000);
    });

  }
};
