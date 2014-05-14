/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var env = require('../utils/env');
var stats = env.stats;
var nconf = env.config;
var logger = env.logger;

var persistenceService = require("./persistence-service");
var random = require('../utils/random');
var Q = require('q');
var userService = require('./user-service');
var moment = require('moment');

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
  stats.userUpdate(user, properties);

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
 * Turn a token into a user/token/client.
 *
 * Returns { user / client / accessToken } hash. If the token is for an anonymous user,
 * user is null;
 */
exports.validateAccessTokenAndClient = function(token, callback) {
  logger.verbose('Validating token');
  return persistenceService.OAuthAccessToken.findOneQ({ token: token })
    .then(function(accessToken) {
      if(!accessToken) {
        logger.warn('Invalid token presented: ', { token: token });
        return null;
      }

      var clientId = accessToken.clientId;
      if(!clientId) {
        logger.warn('Invalid token presented (no client): ', { token: token });

        return null; // code invalid
      }

      var userId = accessToken.userId;   // userId can be null

      // TODO: check for expired tokens
      return Q.all([
          persistenceService.OAuthClient.findByIdQ(clientId),
          userId && userService.findById(userId)
        ])
        .spread(function(client, user) {
          if(!client) {
            logger.warn('Invalid token presented (client not found): ', { token: token });
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
  return Q.fcall(function() {
    if(!userId) throw new Error('userId required');

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
      });
    })
    .nodeify(callback);

};

exports.findOrGenerateAnonWebToken = function(callback) {
  return random.generateToken()
    .then(function(token) {
      return persistenceService.OAuthAccessToken.createQ({
        token: token,
        userId: null,
        clientId: webInternalClientId,
        expires: moment().add('days', 7).toDate()
      }).then(function() {
        return token;
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
