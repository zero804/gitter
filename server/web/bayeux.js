/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var env               = require('../utils/env');
var logger            = env.logger;
var nconf             = env.config;
var stats             = env.stats;

var faye              = require('gitter-faye');
var fayeRedis         = require('gitter-faye-redis');
var deflate           = require('permessage-deflate');
var presenceService   = require('../services/presence-service');
var shutdown          = require('shutdown');
var zlib              = require('zlib');
var AdviceAdjuster    = require('./bayeux/advice-adjuster');
var authenticatorExtension = require('./bayeux/authenticator');
var loggingExtension = require('./bayeux/logging');

/* Disabled after the outage 8 April 2015 XXX investigate further */
// var createDoormanExtension = require('./bayeux/doorman');
var createPingResponderExtension = require('./bayeux/ping-responder');
var superClientExtension = require('./bayeux/super-client');
var pushOnlyServerExtension = require('./bayeux/push-only');
var hidePrivateExtension = require('./bayeux/hide-private');


var STATS_FREQUENCY = 0.01;

function makeServer(endpoint, redisClient, redisSubscribeClient) {
  var adviceAdjuster = new AdviceAdjuster();

  var server = new faye.NodeAdapter({
    mount: endpoint,
    timeout: nconf.get('ws:fayeTimeout'), // Time before an inactive client is timed out
    ping: nconf.get('ws:fayePing'),       // Time between pings from the server to the client
    engine: {
      type: fayeRedis,
      client: redisClient,
      subscriberClient: redisSubscribeClient, // Subscribe. Needs new client
      interval: nconf.get('ws:fayeInterval'), // Faye GC interval
      includeSequence: true,
      namespace: 'fr:',
      statsDelegate: function(category, event) {
        stats.eventHF('bayeux.' + category + '.' + event, 1);
      }
    }
  });

  // adviceAdjuster.monitor(server);

  if(nconf.get('ws:fayePerMessageDeflate')) {
    /* Add permessage-deflate extension to Faye */
    deflate = deflate.configure({
      level: zlib.Z_BEST_SPEED
    });
    server.addWebsocketExtension(deflate);
  }

  // Attach event handlers
  server.addExtension(adviceAdjuster.timingStartExtension());
  server.addExtension(loggingExtension);
  server.addExtension(authenticatorExtension);

  /* Disabled after the outage 8 April 2015 XXX investigate further */
  // server.addExtension(createDoormanExtension(server));

  // Authorisation Extension - decides whether the user
  // is allowed to connect to the subscription channel
  //
  server.addExtension(require('./bayeux/authorisor'));

  server.addExtension(pushOnlyServerExtension);
  server.addExtension(createPingResponderExtension(server));

  server.addExtension(adviceAdjuster.timingEndExtension());
  server.addExtension(adviceAdjuster.adviceExtension());
  server.addExtension(hidePrivateExtension);


  if (fayeLoggingLevel === 'debug') {
    ['connection:open', 'connection:close'].forEach(function(event) {
      server._server._engine.bind(event, function(clientId) {
        logger.verbose("faye-engine: Client " + clientId + ": " + event);
      });
    });

    /** Some logging */
    ['handshake', 'disconnect'].forEach(function(event) {
      server.bind(event, function(clientId) {
        logger.verbose("faye-server: Client " + clientId + ": " + event);
      });
    });

  }

  server.bind('disconnect', function(clientId) {
    logger.info("Client " + clientId + " disconnected");

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

  return server;
}

/**
 * Create the servers
 */
// var serverNew = makeServer('/faye2', env.redis.createClient(nconf.get("redis_nopersist")), env.redis.createClient(nconf.get("redis_nopersist"))); // Subscribe. Needs new client
var serverLegacy = makeServer('/faye', env.redis.getClient(), env.redis.createClient()); // Subscribe. Needs new client

/**
 * Create the clients
 */
// var clientNew = serverNew.getClient();
// clientNew.addExtension(superClientExtension);

var clientLegacy = serverLegacy.getClient();
clientLegacy.addExtension(superClientExtension);


/* This function is used a lot, this version excludes try-catch so that it can be optimised */
function stringifyInternal(object) {
  if(typeof object !== 'object') return JSON.stringify(object);

  var string = JSON.stringify(object);

  // Over cautious
  stats.eventHF('bayeux.message.count', 1, STATS_FREQUENCY);

  if(string) {
    stats.gaugeHF('bayeux.message.size', string.length, STATS_FREQUENCY);
  } else {
    stats.gaugeHF('bayeux.message.size', 0, STATS_FREQUENCY);
  }

  return string;
}

faye.stringify = function(object) {
  try {
    return stringifyInternal(object);
  } catch(e) {
    stats.event('bayeux.message.serialization_error');

    logger.error('Error while serializing JSON message', { exception: e });
    throw e;
  }
};

/* TEMPORARY DEBUGGING SOLUTION */
faye.logger = {
};

var fayeLoggingLevel = nconf.get('ws:fayeLogging');
var logLevels = ['fatal', 'error', 'warn'];
if(fayeLoggingLevel === 'info') logLevels.push('info');
if(fayeLoggingLevel === 'debug') logLevels.push('info', 'debug');

logLevels.forEach(function(level) {
  faye.logger[level] = function(msg) { logger[level]('faye: ' + msg.substring(0,180)); };
});

/** Returns callback(exists) to match faye */
exports.clientExists = function(clientId, callback) {
  // Try the new server first
  // serverNew._server._engine.clientExists(clientId, function(exists) {
  //   if (exists) return callback(true);

    // Try the legacy server next
    serverLegacy._server._engine.clientExists(clientId, function(exists) {
      return callback(exists);
    });
  // });
};

/**
 * Publish a message on Faye
 */
exports.publish = function(channel, message) {
  // clientNew.publish(channel, message);
  clientLegacy.publish(channel, message);
};

/**
 * Destroy a client
 */
exports.destroyClient = function(clientId, callback) {
  if (!clientId) return;

  logger.info('bayeux: client ' + clientId + ' intentionally destroyed.');

  var engineLegacy = serverLegacy._server._engine;
  engineLegacy.destroyClient(clientId, callback);

  // setImmediate(function() {
  //   var count = 0;
  //
  //   // Wait for both callbacks
  //   function done() {
  //     count++;
  //     if (count === 2) {
  //       if (callback) return callback();
  //     }
  //   }
  //
  //   var engineNew = serverNew._server._engine;
  //   engineNew.destroyClient(clientId, done);
  //
  //   var engineLegacy = serverLegacy._server._engine;
  //   engineLegacy.destroyClient(clientId, done);
  // });
};

/**
 * Attach the faye instance to the server
 */
exports.attach = function(httpServer) {
  // serverNew.attach(httpServer);
  serverLegacy.attach(httpServer);
};
