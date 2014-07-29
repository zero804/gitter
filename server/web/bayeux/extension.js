/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var env               = require('../../utils/env');
var logger            = env.logger;
var config            = env.config;
var stats             = env.stats;

var superClientPassword = config.get('ws:superClientPassword');

function requestInfo(req) {
  if(!req) return;

  var referer, origin, connection;
  if(req.headers) {
    referer = req.headers.referer;
    origin = req.headers.origin;
    connection = req.headers.connection;
  }

  var ip = req.headers && req.headers['x-forwarded-for'] ||
           req.connection && req.connection.remoteAddress ||
           req.ip;

  return {
    ip: ip,
    referer: referer,
    origin: origin,
    connection: connection
  };
}

function makeError(err) {
  var status = err.status || 500;
  var errorMessage = err.message || "Server error";

  return status + '::' + errorMessage;
}

function messageIsFromSuperClient(message) {
  return message &&
         message.ext &&
         message.ext.password === superClientPassword;
}

module.exports = function(options) {
  var channel = options.channel;
  var incoming = options.incoming;
  var outgoing = options.outgoing;
  var name = options.name;
  var failureStat = options.failureStat;
  var skipSuperClient = options.skipSuperClient;

  // No point in shared state unless theres an incoming and outgoing extension
  var privateState = options.privateState && incoming && outgoing;

  var extension = {};

  if(incoming) {
    extension.incoming = function(incomingMessage, req, callback) {
      if(channel && incomingMessage.channel !== channel) {
        return callback(incomingMessage);
      }

      if(skipSuperClient && messageIsFromSuperClient(incomingMessage)) {
        return callback(incomingMessage);
      }

      var timeout = setTimeout(function() {
        logger.error("Extension took too long to process!", name, incomingMessage);
      }, 1000);

      if(privateState) {
        if(!incomingMessage._private) incomingMessage._private = { };
      }

      incoming(incomingMessage, req, function(err, outgoingMessage) {
        clearTimeout(timeout);
        if(!outgoingMessage) outgoingMessage = incomingMessage;

        if(err) {
          if(failureStat) stats.eventHF(failureStat);

          var error = makeError(err);
          outgoingMessage.error = error;

          logger.error('bayeux: extension ' + name + '[incoming] failed: ' + error, {
            channel: outgoingMessage.channel,
            token: outgoingMessage.ext && outgoingMessage.ext.token,
            subscription: outgoingMessage.subscription,
            clientId: outgoingMessage.clientId,
            request: requestInfo(req)
          });
        }

        callback(outgoingMessage);
      });
    };
  }

  if(outgoing) {
    extension.outgoing = function(incomingMessage, req, callback) {
      if(channel && incomingMessage.channel !== channel) {
        return callback(incomingMessage);
      }

      if(skipSuperClient && messageIsFromSuperClient(incomingMessage)) {
        return callback(incomingMessage);
      }

      var timeout = setTimeout(function() {
        logger.error("Extension took too long to process!", name, incomingMessage);
      }, 1000);

      outgoing(incomingMessage, req, function(err, outgoingMessage) {
        clearTimeout(timeout);
        if(!outgoingMessage) outgoingMessage = incomingMessage;

        // if(privateState && outgoingMessage._private && outgoingMessage._private[name]) {
        //   delete outgoingMessage._private[name];

        //   // TODO: delete this in an extension
        //   if(Object.keys(outgoingMessage._private).length === 0) {
        //     delete outgoingMessage._private;
        //   }
        // }

        if(err) {
          // In an ideal world we dont throw errors on outbound messages
          if(failureStat) stats.eventHF(failureStat);

          var error = makeError(err);
          outgoingMessage.error = error;

          logger.error('bayeux: extension ' + name + '[outgoing] failed: ' + error + '. Technically this should not happen.', {
            channel: outgoingMessage.channel,
            token: outgoingMessage.ext && outgoingMessage.ext.token,
            subscription: outgoingMessage.subscription,
            clientId: outgoingMessage.clientId,
            request: requestInfo(req)
          });
        }

        callback(outgoingMessage);
      });
    };
  }

  return extension;
};
