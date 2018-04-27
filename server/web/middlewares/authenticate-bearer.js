'use strict';

var env = require('gitter-web-env');
var logger = env.logger;
var StatusError = require('statuserror');
var escapeStringRegexp = require('escape-string-regexp');
var unauthorizedRedirectMap = require('../../utils/unauthorized-redirect-map');
var oauthService = require('../../services/oauth-service');

var unauthorizedUrlRedirectRegexList = Object.keys(unauthorizedRedirectMap).map((redirectKey) => {
  const redirectUrl = unauthorizedRedirectMap[redirectKey];
  return new RegExp(`${escapeStringRegexp(redirectUrl)}(\\/(\\?.*)?)?$`);
});

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

    if (parts.length === 2) {
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

  // Avoid a redirect loop even when someone is forcing a token via
  // `?access_token=xxxtoken` query parameter or `Authorization: bearer xxxtoken` header
  var alreadyOnUnauthorizedUrl = unauthorizedUrlRedirectRegexList.some((unauthorizedRe) => {
    return req.url.match(unauthorizedRe);
  });
  if(!accessToken || alreadyOnUnauthorizedUrl) return next();

  return oauthService.validateAccessTokenAndClient(accessToken)
    .then(function(tokenInfo) {
      // Token not found
      if(!tokenInfo) return next(new StatusError(401, 'Token not found'));

      // Anonymous tokens cannot be used for Bearer tokens
      if(!tokenInfo.user) return next(new StatusError(401, 'Anonymous tokens cannot be used for Bearer tokens'));

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
