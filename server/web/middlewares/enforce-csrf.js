/*jshint globalstrict:true, trailing:false, unused:true, node:true */
'use strict';

var winston = require('../../utils/winston');

module.exports = function(req, res, next) {
  /* OAuth clients have req.authInfo. Aways let them through */
  if(req.authInfo) return next();

  // ignore these methods, they shouldnt alter state
  if('GET' == req.method || 'HEAD' == req.method || 'OPTIONS' == req.method) return next();

  if(isInWhitelist(req)) {
    winston.verbose('skipping csrf check for ' + req.path);
    return next();
  }

  var clientToken = getClientToken(req);
  if(!clientToken) {
    winston.warn('csrf: Rejecting client ' + req.ip + ' request to ' + req.path + ' as they presented no token');
    return next(403);
  }

  if(req.session.accessToken !== clientToken) {
    winston.warn('csrf: Rejecting client ' + req.ip + ' request to ' + req.path + ' as they presented an illegal token');
    return next(403);
  }

  return next();
};

function isInWhitelist(req) {
         // webhooks handler doesnt send a token, but the uri is hard to guess
  return (req.path.indexOf('/api/private/hook/') === 0) ||
         // Transloadit callback
         (req.path.indexOf('/api/private/transloadit/') === 0) ||
         // oauth post token endpoint for native login has its own auth
         (req.path === '/login/oauth/token') ||
         (req.path === '/oauth/authorize/decision');
}

function getClientToken(req) {
  return (req.body && req.body.accessToken) ||
         (req.query && req.query.accessToken) ||
         (req.headers['x-access-token']) ||
         (req.headers['x-csrf-token']) ||
         (req.headers['x-xsrf-token']);
}
