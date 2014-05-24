/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var env               = require('../../utils/env');
var logger            = env.logger;
var nconf             = env.config;

// function destroyClient(clientId) {
//   if(!clientId) return;
//   process.nextTick(function() {
//     var engine = server._server._engine;
//     engine.destroyClient(clientId, function() {
//       logger.info('bayeux: client ' + clientId + ' intentionally destroyed.');
//     });
//   });
// }

module.exports = {
  outgoing: function(message, req, callback) {
    var error = message.error;

    if(error) {
      var errorCode = error.split(/::/)[0];
      if(errorCode) errorCode = parseInt(errorCode, 10);

      if(errorCode === 401) {
        var reconnect;

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


