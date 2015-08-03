/*jshint globalstrict:true, trailing:false, unused:true, node:true */
'use strict';

var oauthService = require('../../services/oauth-service');
var env = require('gitter-web-env');
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

  function generateAccessToken() {
    if(req.user) {
      logger.verbose('csrf: Using web token');
      stats.eventHF('token.authenticated.web');

      return oauthService.findOrGenerateWebToken(req.user.id)
        .spread(function(serverToken/*, client */) {
          setAccessToken(req, userId, serverToken);
        });
    }

    logger.verbose('csrf: Generating new anonymous token');
    stats.eventHF('token.anonymous.generate');

    /* Generate an anonymous token */
    return oauthService.generateAnonWebToken()
      .spread(function(token /*, client */) {
        setAccessToken(req, null, token);
      });
  }

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
    return oauthService.validateAccessTokenAndClient(sessionAccessToken)
      .then(function(result) {
        if (!result) {
          return generateAccessToken();
        }
        req.accessToken = sessionAccessToken;
      })
      .catch(function(err) {
        logger.verbose('csrf: OAuth access token validation failed', { exception: err });
        return generateAccessToken();
      })
      .nodeify(next);
  }

  return generateAccessToken()
    .nodeify(next);

};
