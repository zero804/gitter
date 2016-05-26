"use strict";

var env = require('gitter-web-env');
var stats = env.stats;
var logger = env.logger;
var debug = require('debug')('gitter:infra:enforce-csrf-middleware');

var escapeRegExp = require('../../utils/escape-regexp');

var WHITELIST = [
'/api/private/hook/',
'/api/private/transloadit/',
'/api/private/statsc',
'/api/v1/apn',
'/login/oauth/token',
'/login/oauth/authorize/decision',
'/api/private/subscription/'
];

if (env.config.get('ws:startFayeInPrimaryApp')) {
  WHITELIST.push('/faye');
  WHITELIST.push('/bayeux');
}

var WHITELIST_REGEXP = new RegExp('^(' + WHITELIST.map(escapeRegExp).join('|') + ')');

module.exports = function(req, res, next) {
  // ignore these methods, they shouldnt alter state
  if(req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();

  /* OAuth clients have req.authInfo. Aways let them through */
  if(req.authInfo) return next();

  if(isInWhitelist(req)) {
    debug('skipping csrf check for %s', req.path);
    return next();
  }

  var clientToken = getClientToken(req);
  if(!clientToken) {
    stats.event('token.rejected.notpresented');
    logger.warn('csrf: Rejecting client ' + req.ip + ' request to ' + req.path + ' as they presented no token');
    return next(403);
  }

  if(req.accessToken !== clientToken) {
    stats.event('token.rejected.mismatch');

    if(!req.user) {
      logger.warn('csrf: Rejecting client ' + req.ip + ' request to ' + req.path + ' as they are probably logged out', {
        serverAccessToken: req.accessToken,
        clientToken: clientToken,
      });
    } else {
      logger.warn('csrf: Rejecting client ' + req.ip + ' request to ' + req.path + ' as they presented an illegal token', {
        serverAccessToken: req.accessToken,
        clientToken: clientToken,
        username: req.user.username,
        userId: req.user.id
      });
    }

    return next(403);
  }

  return next();
};

function isInWhitelist(req) {
  return WHITELIST_REGEXP.test(req.path);
}

function getClientToken(req) {
  return (req.body && req.body.accessToken) ||
         (req.query && req.query.accessToken) ||
         (req.headers['x-access-token']) ||
         (req.headers['x-csrf-token']) ||
         (req.headers['x-xsrf-token']);
}
