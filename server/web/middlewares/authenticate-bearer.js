'use strict';

var oauthService = require('../../services/oauth-service');
var env = require('gitter-web-env');
var logger = env.logger;

function getAccessToken(req) {

  if(req.headers && req.headers['authorization']) {
    var authHeader = req.headers['authorization'];

    /* Temporary fix - remove 15 May 2014 */
    /* A bug in the OSX client adds this header each time a refresh is done */
    if(authHeader.indexOf('Bearer ') === 0 && authHeader.indexOf(',') >= 0) {
      logger.warn('auth: compensating for incorrect auth header');
      authHeader = authHeader.split(/,/)[0];
    }

    var parts = authHeader.split(' ');

    if (parts.length == 2) {
      var scheme = parts[0];

      if (/Bearer/i.test(scheme)) {
        return parts[1];
      }
    }
  }

  if (req.body && req.body['access_token']) {
    return req.body['access_token'];
  }

  if (req.query && req.query['access_token']) {
    return req.query['access_token'];
  }

  // FIXME Hack for the node-webkit app, we *have* to send the token in the user-agent header.
  // If in the future node-webkit adds support for custom headers we can remove this.
  if(req.headers && req.headers['user-agent']) {
    var ua_token = req.headers['user-agent'].match(/Token\/(\w+)/);
    if (ua_token) return ua_token[1];
  }

}
/**
 *
 */
module.exports = function(req, res, next) {
  /* No access token? Continue! */
  var accessToken = getAccessToken(req);
  if(!accessToken) return next();

  return oauthService.validateAccessTokenAndClient(accessToken)
    .then(function(tokenInfo) {
      // Token not found
      if(!tokenInfo) return next(401);

      // Anonymous tokens cannot be used for Bearer tokens
      if(!tokenInfo.user) return next(401);

      var user = tokenInfo.user;
      var client = tokenInfo.client;

      req.login(user, function(err) {
        if(err) return next(err);

        req.authInfo = { client: client, accessToken: accessToken };
        next();
        return null;
      });
    })
    .catch(next);

};
