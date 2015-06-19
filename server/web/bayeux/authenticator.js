'use strict';

var env               = require('gitter-web-env');
var logger            = env.logger;

var oauth             = require('../../services/oauth-service');
var presenceService   = require('../../services/presence-service');
var contextGenerator  = require('../context-generator');
var StatusError       = require('statuserror');
var bayeuxExtension   = require('./extension');
var clientUsageStats  = require('../../utils/client-usage-stats');
var appVersion        = require('../appVersion');

function getConnectionType(incoming) {
  if(!incoming) return 'online';

  switch(incoming) {
    case 'online': return 'online';
    case 'mobile': return 'mobile';

    default:
      return 'online';
  }
}

var version = appVersion.getVersion();

// Validate handshakes
module.exports = bayeuxExtension({
  channel: '/meta/handshake',
  name: 'authenticator',
  failureStat: 'bayeux.handshake.deny',
  skipSuperClient: true,
  skipOnError: true,
  privateState: true,
  incoming: function(message, req, callback) {
    var ext = message.ext || {};

    var token = ext.token;

    if(!token) {
      return callback(new StatusError(401, "Access token required"));
    }

    oauth.validateAccessTokenAndClient(ext.token, function(err, tokenInfo) {
      if(err) return callback(err);

      if(!tokenInfo) {
        return callback(new StatusError(401, "Invalid access token"));
      }

      var user = tokenInfo.user;
      var oauthClient = tokenInfo.client;
      var userId = user && user.id;

      if(user && oauthClient) {
        clientUsageStats.record(user, oauthClient);
      }

      logger.silly('bayeux: handshake', {
        appVersion: ext.appVersion,
        username: user && user.username,
        client: oauthClient.name
      });

      var connectionType = getConnectionType(ext.connType);

      message._private.authenticator = {
        userId: userId,
        connectionType: connectionType,
        client: ext.client,
        troupeId: ext.troupeId,
        eyeballState: parseInt(ext.eyeballs, 10) || 0
      };

      return callback(null, message);
    });

  },

  outgoing: function(message, req, callback) {
    if(!message.ext) message.ext = {};
    message.ext.appVersion = version;

    var state = message._private && message._private.authenticator;
    if(!state) return callback(null, message);

    var userId = state.userId;
    var connectionType = state.connectionType;
    var clientId = message.clientId;
    var client = state.client;
    var troupeId = state.troupeId;
    var eyeballState = state.eyeballState;

    // Get the presence service involved around about now
    presenceService.userSocketConnected(userId, clientId, connectionType, client, troupeId, eyeballState, function(err) {

      if(err) {
        logger.warn("bayeux: Unable to associate connection " + clientId + ' to ' + userId, { troupeId: troupeId, client: client, exception: err });
        return callback(err);
      }

      logger.info("bayeux: connection " + clientId + ' is associated to ' + userId, { troupeId: troupeId, client: client });

      message.ext.userId = userId;

      // if(troupeId) {
      //   recentRoomService.saveLastVisitedTroupeforUserId(userId, troupeId);
      // }

      // If the troupeId was included, it means we've got a native
      // client and they'll be looking for a snapshot:
      contextGenerator.generateSocketContext(userId, troupeId)
        .nodeify(function(err, context) {
          if(err) return callback(err);

          message.ext.context = context;

          // Not possible to throw an error here, so just carry only
          callback(null, message);
        });

    });

  }

});
