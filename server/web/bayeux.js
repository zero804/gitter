/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var env               = require('../utils/env');
var logger            = env.logger;
var nconf             = env.config;
var stats             = env.stats;

var faye              = require('faye');
var fayeRedis         = require('faye-redis');
var presenceService   = require('../services/presence-service');
var shutdown          = require('shutdown');

var superClientPassword = nconf.get('ws:superClientPassword');

function destroyClient(clientId) {
  if(!clientId) return;

  process.nextTick(function() {
    var engine = server._server._engine;
    engine.destroyClient(clientId, function() {
      logger.info('bayeux: client ' + clientId + ' intentionally destroyed.');
    });

  });

}

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

/* TEMPORARY DEBUGGING SOLUTION */
var re;
var fs = require('fs');

setInterval(function() {
  fs.exists('/tmp/faye-logging-filter', function(exists) {
    if(exists) {
      fs.readFile('/tmp/faye-logging-filter', 'utf8', function(err, data) {
        if(err) {
          logger.info('Unable to read /tmp/faye-logging-filter', { exception: err });
        }

        var lines = data.split(/[\n]/)
          .map(function(line) { return line.trim(); })
          .filter(function(line) { return line; });

        try {
          re = new RegExp(lines.join('|'));
        } catch(e) {
          re = null;
          logger.info('Unable to create regular expression', { exception: err });
        }

      });
    } else {
      re = null;
    }
  });
}, 5000);

faye.logger = {
  debug: function(msg) {
    if(!re) return;
    if(msg.match(re)) {
      logger.verbose('faye: ' + msg);
    }
  },
  info: function(msg) {
    if(!re) return;
    if(msg.match(re)) {
      logger.verbose('faye: ' + msg);
    }
  }
};

var logLevels = ['fatal', 'error', 'warn'];
logLevels/*.slice(0, 1 + logLevel)*/.forEach(function(level) {
  faye.logger[level] = function(msg) { logger[level]('faye: ' + msg); };
});

var engine = server._server._engine;

module.exports = {
  server: server,
  engine: engine,
  client: client,
  destroyClient: destroyClient,
  attach: function(httpServer) {

    // Attach event handlers
    server.addExtension(require('./bayeux/logger'));
    server.addExtension(require('./bayeux/authenticator'));
    server.addExtension(require('./bayeux/connect-limiter'));
    server.addExtension(require('./bayeux/authoriser'));
    server.addExtension(require('./bayeux/push-only-server'));
    server.addExtension(require('./bayeux/hide-password'));
    server.addExtension(require('./bayeux/ping-reponder')(engine));
    server.addExtension(require('./bayeux/advise-adjuster'));

    client.addExtension(superClient);

    ['connection:open', 'connection:close'].forEach(function(event) {
      engine.bind(event, function(clientId) {
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
      engine.disconnect();
      setTimeout(callback, 1000);
    });

    server.attach(httpServer);
  }
};

