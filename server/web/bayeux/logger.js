/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var env               = require('../../utils/env');
var logger            = env.logger;
var stats             = env.stats;

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

module.exports = {
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


