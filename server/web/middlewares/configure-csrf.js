/*jshint globalstrict:true, trailing:false, unused:true, node:true */
'use strict';

var oauthService = require('../../services/oauth-service');
var env = require('../../utils/env');
var logger = env.logger;

function setAccessToken(req, accessToken) {
  if(req.session) {
    req.session.accessToken = accessToken;
  }

  req.accessToken = accessToken;
}

module.exports = function(req, res, next) {
  /* OAuth clients have req.authInfo. Propogate their access token to their entire session
   * so that all related web-requests are made by the same client
   */
  if(req.authInfo && req.authInfo.accessToken) {
    logger.verbose('Using OAuth access token');

    setAccessToken(req, req.authInfo.accessToken);
    return next();
  }

  if(req.session && req.session.accessToken) {
    req.accessToken = req.session.accessToken;
    return next();
  }

  if(req.user) {
    logger.verbose('Using OAuth access token');

    return oauthService.findOrGenerateWebToken(req.user.id)
      .then(function(serverToken) {
        setAccessToken(req, serverToken);
      })
      .nodeify(next);
  }

  /* Generate an anonymous token */
  return oauthService.findOrGenerateAnonWebToken()
    .then(function(token) {
      setAccessToken(req, token);
    })
    .nodeify(next);

};
