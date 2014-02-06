/*jshint globalstrict:true, trailing:false, unused:true, node:true */
'use strict';

var Q = require('q');
var winston = require('winston');
var assert = require('assert');
var oauthService = require('../services/oauth-service');

module.exports = function(req, res, next){
  // ignore these methods
  if ('GET' == req.method || 'HEAD' == req.method || 'OPTIONS' == req.method) return next();

  var clientToken = getClientToken(req);

  getServerTokenQ(req)
    .then(function(serverToken) {
      if(!clientToken || clientToken !== serverToken) {
        return next(403);
      }

      return next();
    })
    .fail(function(err) {
      winston.err('couldnt get server auth token', err);
      next(403);
    });
};

function getServerTokenQ(req) {
  return Q.fcall(function() {
    assert(req.session, 'session is required');

    if(req.session.accessToken) return req.session.accessToken;

    assert(req.user, 'user is required');

    return oauthService.findOrGenerateWebToken(req.user.id)
      .then(function(serverToken) {
        req.session.accessToken = serverToken;
        return req.session.accessToken;
      });
  });
}

function getClientToken(req) {
  return (req.body && req.body.accessToken) ||
         (req.query && req.query.accessToken) ||
         (req.headers['x-access-token']) ||
         (req.headers['x-csrf-token']) ||
         (req.headers['x-xsrf-token']);
}
