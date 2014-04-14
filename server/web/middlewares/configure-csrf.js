/*jshint globalstrict:true, trailing:false, unused:true, node:true */
'use strict';

var oauthService = require('../../services/oauth-service');

module.exports = function(req, res, next) {
  /* OAuth clients have req.authInfo. Aways let them through */
  if(req.authInfo) return next();

  // if(!req.session || req.session.accessToken) return next();

  if(req.user) {
    return oauthService.findOrGenerateWebToken(req.user.id)
      .then(function(serverToken) {
        req.session.accessToken = serverToken;
      })
      .nodeify(next);
  }

  /* Generate an anonymous token */
  return oauthService.findOrGenerateAnonWebToken()
    .then(function(token) {
      req.session.accessToken = token;
    })
    .nodeify(next);

};
