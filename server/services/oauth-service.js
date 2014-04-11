/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var persistenceService = require("./persistence-service");
var statsService = require("./stats-service");
var nconf = require('../utils/config');
var random = require('../utils/random');
var Q = require('q');
var userService = require('./user-service');
var winston = require('../utils/winston');

var WEB_INTERNAL_CLIENT_KEY = 'web-internal';
var webInternalClientId = null;

/* Load webInternalClientId once at startup */
persistenceService.OAuthClient.findOne({ clientKey: WEB_INTERNAL_CLIENT_KEY }, function(err, oauthClient) {
  if(err) throw new Error("Unable to load internal client id");
  if(!oauthClient) throw new Error("Unable to load internal client id. Have you loaded it into mongo?");

  webInternalClientId = oauthClient._id;
});

var ircClientId;

persistenceService.OAuthClient.findOne({ clientKey: nconf.get('irc:clientKey') }, function(err, oauthClient) {
  if(err) throw new Error("Unable to load internal client id");
  if(!oauthClient) throw new Error("Unable to load internal client id. Have you loaded it into mongo?");

  ircClientId = oauthClient._id;
});





exports.findClientById = function(id, callback) {
  persistenceService.OAuthClient.findById(id, callback);
};

exports.saveAuthorizationCode = function(code, client, redirectUri, user, callback) {

  var properties = {};
  properties['Last login from ' + client.tag] = new Date();
  statsService.userUpdate(user, properties);

  var authCode = new persistenceService.OAuthCode({
      code: code,
      clientId: client.id,
      redirectUri: redirectUri,
      userId: user.id
  });
  authCode.save(callback);
};

exports.findAuthorizationCode = function(code, callback) {
  persistenceService.OAuthCode.findOne({ code: code }, callback);
};

exports.findAccessToken = function(token, callback) {
  persistenceService.OAuthAccessToken.findOne({ token: token }, callback);
};


/**
 * Turn a token into a user/token/client
 *
 * TODO: this really needs to be cached!
 */
exports.validateAccessTokenAndClient = function(token, callback) {
  winston.verbose('Validating token');
  return persistenceService.OAuthAccessToken.findOneQ({ token: token })
    .then(function(accessToken) {
      if(!accessToken) {
        winston.warn('Invalid token presented: ', { token: token });
        return null;
      }

      var clientId = accessToken.clientId;
      if(!clientId) {
        winston.warn('Invalid token presented (no client): ', { token: token });

        return null; // code invalid
      }

      var userId = accessToken.userId;
      if(!userId) {
        winston.warn('Invalid token presented (no userId): ', { token: token });
        return null; // code invalid
      }

      return Q.all([
          persistenceService.OAuthClient.findById(clientId),
          userService.findById(userId)
        ])
        .spread(function(client, user) {
          if(!client) {
            winston.warn('Invalid token presented (client not found): ', { token: token });
            return null;
          }

          if(!client) {
            winston.warn('Invalid token presented (client not found): ', { token: token });
            return null;
          }

          return { user: user, client: client, accessToken: accessToken };
        });
    })
    .nodeify(callback);
};



exports.removeAllAccessTokensForUser = function(userId, callback) {
  return persistenceService.OAuthAccessToken.removeQ({ userId: userId })
    .nodeify(callback);
};

exports.saveAccessToken = function(token, userId, clientId, callback) {

  var accessToken = new persistenceService.OAuthAccessToken({
    token: token,
    userId: userId,
    clientId: clientId
  });
  accessToken.save(callback);
};

exports.findClientByClientKey = function(clientKey, callback) {
  persistenceService.OAuthClient.findOne({ clientKey: clientKey }, callback);
};

// TODO: move some of this functionality into redis for speed
// TODO: make the web tokens expire
exports.findOrGenerateWebToken = function(userId, callback) {
  return persistenceService.OAuthAccessToken.findOneQ({ userId: userId, clientId: webInternalClientId })
      .then(function(oauthAccessToken) {
        if(oauthAccessToken) return oauthAccessToken.token;

        return random.generateToken()
          .then(function(token) {
            return persistenceService.OAuthAccessToken.createQ({ token: token, userId: userId, clientId: webInternalClientId })
              .then(function() {
                return token;
              });
          });
      })
      .nodeify(callback);

};

exports.findOrGenerateIRCToken = function(userId, callback) {
  return persistenceService.OAuthAccessToken.findOneQ({ userId: userId, clientId: ircClientId })
      .then(function(oauthAccessToken) {
        if(oauthAccessToken) return oauthAccessToken.token;

        return random.generateToken()
          .then(function(token) {
            return persistenceService.OAuthAccessToken.createQ({ token: token, userId: userId, clientId: ircClientId })
              .then(function() {
                return token;
              });
            });
      })
      .nodeify(callback);

};


// TODO: move some of this functionality into redis for speed
// TODO: make the web tokens expire
exports.validateWebToken = function(token, callback) {
  persistenceService.OAuthAccessToken.findOne({ token: token, clientId: webInternalClientId }, function(err, accessToken) {
    if(err) return callback(err);
    if(!accessToken) return callback("Access token not found");

    return callback(null, accessToken.userId);
  });
};

