'use strict';

var env = require('gitter-web-env');
var config = env.config;

module.exports = {
  outgoing: function(message, req, callback) {
    delete message._private;
    var error = message.error;

    if(error) {
      var errorCode = error.split(/::/)[0];
      if(errorCode) errorCode = parseInt(errorCode, 10);

      if(errorCode === 401) {
        var reconnect;

        if(message.channel === '/meta/handshake') {
          // Handshake failing, go away
          reconnect = 'none';
        } else {
          // Rehandshake
          reconnect = 'handshake';
        }

        if (!message.advice) message.advice = { };

        message.advice.reconnect = reconnect;
        message.advice.interval = config.get('ws:fayeRetry') * 1000;

      }
    }

    callback(message);
  }
};
