/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var presenceService   = require('../../services/presence-service');
var bayeuxExtension   = require('./extension');

// CONNECT extension
module.exports = bayeuxExtension({
  channel: '/meta/connect',
  name: 'doorman',
  failureStat: 'bayeux.connect.deny',
  skipSuperClient: true,
  incoming: function(message, req, callback) {
    var clientId = message.clientId;

    presenceService.socketExists(clientId, function(err, exists) {
      if(err) return callback(err);

      if(!exists) return callback({ status: 401, message: "Socket association does not exist" });

      return callback(null, message);
    });

  }
});



