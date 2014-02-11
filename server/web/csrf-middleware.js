/*jshint globalstrict:true, trailing:false, unused:true, node:true */
'use strict';

var Q = require('q');
var winston = require('winston');
var oauthService = require('../services/oauth-service');

module.exports = function(req, res, next){

  addTokenToSession(req).then(function() {

    // ignore these methods, they shouldnt alter state
    if('GET' == req.method || 'HEAD' == req.method || 'OPTIONS' == req.method) return next();

    // oath strategy has already authenticated these with the bearer token
    if(hasBearerTokenHeader(req)) return next();

    if(isInWhitelist(req)) {
      winston.warn('skipping csrf check for '+req.path);
      return next();
    }

    var clientToken = getClientToken(req);
    if(!clientToken || clientToken !== req.session.accessToken) {
      return next(403);
    } else {
      return next();
    }

  }).fail(next);
};

function addTokenToSession(req) {
  return Q.fcall(function() {
    if(!req.session.accessToken && !!req.user) {
      return oauthService.findOrGenerateWebToken(req.user.id)
        .then(function(serverToken) {
          req.session.accessToken = serverToken;
        });
    }
  });
}

function hasBearerTokenHeader(req) {
  var authHeader = req.headers['Authorization'] || '';
  return (authHeader.split(' ')[0] === 'Bearer');
}

function isInWhitelist(req) {
         // webhooks handler doesnt send a token, but the uri is hard to guess
  return (req.path.indexOf('/api/private/hook/') === 0) ||
         // oauth post token endpoint for native login has its own auth
         (req.path === '/login/oauth/token');
}

function getClientToken(req) {
  return (req.body && req.body.accessToken) ||
         (req.query && req.query.accessToken) ||
         (req.headers['x-access-token']) ||
         (req.headers['x-csrf-token']) ||
         (req.headers['x-xsrf-token']);
}
