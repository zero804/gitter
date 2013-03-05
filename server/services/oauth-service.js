/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var persistenceService = require("./persistence-service");
var uuid = require('node-uuid');

var WEB_INTERNAL_CLIENT_KEY = 'web-internal';
var webInternalClientId = null;

/* Load webInternalClientId once at startup */
persistenceService.OAuthClient.findOne({ clientKey: WEB_INTERNAL_CLIENT_KEY }, function(err, oauthClient) {
  if(err) throw new Error("Unable to load internal client id");
  if(!oauthClient) throw new Error("Unable to load internal client id. Have you loaded it into mongo?");

  webInternalClientId = oauthClient._id;
});


exports.findClientById = function(id, callback) {
  persistenceService.OAuthClient.findById(id, callback);
};

exports.saveAuthorizationCode = function(code, clientId, redirectUri, userId, callback) {
  var authCode = new persistenceService.OAuthCode({
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
  persistenceService.OAuthAccessToken.findOne({ userId: userId, clientId: webInternalClientId }, function(err, oauthAccessToken) {
    if(err) return callback(err);
    if(oauthAccessToken) return callback(null, oauthAccessToken.token);

    oauthAccessToken = new persistenceService.OAuthAccessToken({ token: uuid.v4(), userId: userId, clientId: webInternalClientId });
    oauthAccessToken.save(function(err) {
      if(err) return callback(err);

      callback(null, oauthAccessToken.token);
    });
  });

};

exports.validateToken = function(token, callback) {
  persistenceService.OAuthAccessToken.findOne({ token: token }, function(err, accessToken) {
    if(err) return callback(err);
    if(!accessToken) return callback("Access token not found");

    return callback(null, accessToken.userId);
  });
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

