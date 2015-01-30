/*jshint globalstrict:true, trailing:false, unused:true, node:true */
'use strict';

var oauthService = require('../../services/oauth-service');
var env = require('../../utils/env');
var stats = env.stats;
var logger = env.logger;

function setAccessToken(req, userId, accessToken) {
  if(req.session) {
    req.session['accessToken_' + (userId ? userId : '')] = accessToken;
  }

  req.accessToken = accessToken;
}

function getSessionAccessToken(req, userId) {
  if(req.session) {
    return req.session['accessToken_' + (userId ? userId : '')];
  }
}

module.exports = function(req, res, next) {
  var userId = req.user && req.user.id;

  /* OAuth clients have req.authInfo. Propogate their access token to their entire session
   * so that all related web-requests are made by the same client
   */
  if(req.authInfo && req.authInfo.accessToken) {
    logger.verbose('csrf: Using OAuth access token');
    setAccessToken(req, userId, req.authInfo.accessToken);
    return next();
  }

  var sessionAccessToken = getSessionAccessToken(req, userId);
  if(sessionAccessToken) {
    req.accessToken = sessionAccessToken;
    return next();
  }

  if(req.user) {
    logger.verbose('csrf: Using web token');
    stats.eventHF('token.authenticated.web');

    return oauthService.findOrGenerateWebToken(req.user.id)
      .spread(function(serverToken/*, client */) {
        setAccessToken(req, userId, serverToken);
      })
      .nodeify(next);
  }

  logger.verbose('csrf: Generating new anonymous token');
  stats.eventHF('token.anonymous.generate');

  /* Generate an anonymous token */
  return oauthService.generateAnonWebToken()
    .spread(function(token /*, client */) {
      setAccessToken(req, null, token);
    })
    .nodeify(next);

};
