/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var env               = require('../../utils/env');
var logger            = env.logger;

var oauth             = require('../../services/oauth-service');
var presenceService   = require('../../services/presence-service');
var contextGenerator  = require('../context-generator');
var appVersion        = require('../appVersion');
var bayeuxExtension   = require('./extension');

var appTag = appVersion.getAppTag();

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
module.exports = bayeuxExtension({
  channel: '/meta/handshake',
  name: 'authenticator',
  failureStat: 'bayeux.handshake.deny',
  skipSuperClient: true,
  incoming: function(message, req, callback) {
    var ext = message.ext || {};

    var token = ext.token;

    if(!token) {
      return callback({ status: 401, message: "Access token required" });
    }

    oauth.validateAccessTokenAndClient(ext.token, function(err, tokenInfo) {
      if(err) return callback(err);

      if(!tokenInfo) {
        return callback({ status: 401, message: "Invalid access token" });
      }

      var user = tokenInfo.user;
      var oauthClient = tokenInfo.client;
      var userId = user && user.id;

      logger.verbose('bayeux: handshake', { username: user && user.username, client: oauthClient.name });

      var connectionType = getConnectionType(ext.connType);
      var client = ext.client || '';
      var troupeId = ext.troupeId || '';
      var eyeballState = ext.eyeballs || '';

      // This is an UGLY UGLY hack, but it's the only
      // way possible to pass the userId to the outgoing extension
      // where we have the clientId (but not the userId)
      var id = message.id || '';
      message.id = [id, userId, connectionType, client, troupeId, eyeballState].join(':');

      return callback(null, message);
    });

  },

  outgoing: function(message, req, callback) {
    if(!message.ext) message.ext = {};
    message.ext.appVersion = appTag;

    // The other half of the UGLY hack,
    // get the userId out from the message
    var fakeId = message.id;
    if(!fakeId) {
      return callback(null, message);
    }

    var parts = fakeId.split(':');
    if(parts.length != 6) {
      return callback(null, message);
    }

    message.id = parts[0] || undefined; // id not required for an incoming message
    var userId = parts[1] || undefined;
    var connectionType = parts[2];
    var clientId = message.clientId;
    var client = parts[3] || undefined;
    var troupeId = parts[4] || undefined;
    var eyeballState = parseInt(parts[5], 10) || 0;

    if(!userId) {
      // Not logged in? Simply return
      return callback(null, message);
    }

    // Get the presence service involved around about now
    presenceService.userSocketConnected(userId, clientId, connectionType, client, troupeId, eyeballState, function(err) {
      logger.info("bayeux: connection " + clientId + ' is associated to ' + userId, { troupeId: troupeId, client: client });

      if(err) return callback(err);

      message.ext.userId = userId;

      // if(troupeId) {
      //   recentRoomService.saveLastVisitedTroupeforUserId(userId, troupeId);
      // }

      // If the troupeId was included, it means we've got a native
      // client and they'll be looking for a snapshot:
      contextGenerator.generateSocketContext(userId, troupeId, function(err, context) {
        if(err) return callback(err);

        message.ext.context = context;

        // Not possible to throw an error here, so just carry only
        callback(null, message);
      });

    });

  }

});


