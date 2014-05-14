/*jshint globalstrict:true, trailing:false, unused:true, node:true */
'use strict';

var oauthService = require('../../services/oauth-service');

module.exports = function(req, res, next) {
  /* OAuth clients have req.authInfo. Propogate their access token to their entire session
   * so that all related web-requests are made by the same client
   */
  if(req.authInfo) {
    if(req.session && req.authInfo.accessToken) {
      req.session.accessToken = req.authInfo.accessToken;
    }
    return next();
  }

  // Emergency removal of this
  // /* Does the user already have an acces token? */
  // if(req.session && req.session.accessToken) {
  //   return next();
  // }

  if(req.user) {
    return oauthService.findOrGenerateWebToken(req.user.id)
      .then(function(serverToken) {
        if(req.session) req.session.accessToken = serverToken;
      })
      .nodeify(next);
  }

  /* Generate an anonymous token */
  return oauthService.findOrGenerateAnonWebToken()
    .then(function(token) {
      if(req.session) req.session.accessToken = token;
    })
    .nodeify(next);

};
