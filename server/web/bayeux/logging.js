/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var env               = require('gitter-web-env');
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
        break;

      case '/meta/connect':
        stats.eventHF('bayeux.connect');
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
