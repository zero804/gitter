'use strict';

var oauthService = require('../../services/oauth-service');
var debug = require('debug')('gitter:configure-csrf');
var env = require('gitter-web-env');
var stats = env.stats;

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
      debug('csrf: Using web token');
      stats.eventHF('token.authenticated.web');

      return oauthService.findOrGenerateWebToken(req.user.id)
        .spread(function(serverToken/*, client */) {
          setAccessToken(req, userId, serverToken);
          return null;
        });
    }

    debug('csrf: Generating new anonymous token');
    stats.eventHF('token.anonymous.generate');

    /* Generate an anonymous token */
    return oauthService.generateAnonWebToken()
      .spread(function(token /*, client */) {
        setAccessToken(req, null, token);
        return null;
      });
  }

  /* OAuth clients have req.authInfo. Propogate their access token to their entire session
   * so that all related web-requests are made by the same client
   */
  if(req.authInfo && req.authInfo.accessToken) {
    debug('csrf: Using OAuth access token');
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
        debug('csrf: OAuth access token validation failed: %j', err);
        return generateAccessToken();
      })
      .nodeify(next);
  }

  return generateAccessToken()
    .nodeify(next);

};
