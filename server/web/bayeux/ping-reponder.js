/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var presenceService   = require('../../services/presence-service');
var bayeuxExtension   = require('./extension');

module.exports = function(engine) {
  return bayeuxExtension({
    channel: '/api/v1/ping2',
    name: 'pingResponder',
    failureStat: 'bayeux.ping.deny',
    incoming: function(message, req, callback) {
      // Remember we've got the ping reason if we need it
      //var reason = message.data && message.data.reason;

      var clientId = message.clientId;

      engine.clientExists(clientId, function(exists) {
        if(!exists) return callback({ status: 401, message: "Client does not exist"});

        presenceService.socketExists(clientId, function(err, exists) {
          if(err) return callback(err);

          if(!exists) return callback({ status: 401, message: "Socket association does not exist" });

          return callback(null, message);
        });

      });
    }
  });
};



