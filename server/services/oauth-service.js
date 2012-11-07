/*jslint node: true */
"use strict";

var persistenceService = require("./persistence-service");

exports.findClientById = function(id, callback) {
  persistenceService.OAuthClient.findById(id, callback);
};

exports.saveAuthorizationCode = function(code, clientId, redirectUri, userId, callback) {
  var authCode = persistenceService.OAuthCode({
      code: code,
      clientId: clientId,
      redirectUri: redirectUri,
      userId: userId
  });
  authCode.save(callback);
};

exports.findAuthorizationCode = function(code, callback) {
  persistenceService.OAuthCode.findOne({ code: code }, callback);
};


exports.findAccessToken = function(token, callback) {
  persistenceService.OAuthAccessToken.findOne({ token: token }, callback);
};

exports.saveAccessToken = function(token, userId, clientId, callback) {
  var accessToken = persistenceService.OAuthAccessToken({
    token: token,
    userId: userId,
    clientId: clientId
  });
  accessToken.save(callback);
};

exports.findClientByClientId = function(clientId, callback) {
  persistenceService.OAuthClient.findOne({ clientId: clientId }, callback);
};
