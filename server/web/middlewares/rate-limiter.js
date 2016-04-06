"use strict";

var dolph       = require('dolph');
var redis       = require("../../utils/redis");
var redisClient = redis.getClient();

var env         = require('gitter-web-env');
var config      = env.config;

module.exports = dolph({
  prefix: 'rate:',
  limit: config.get('web:apiRateLimit') || 100,
  expiry: 60,
  applyLimit: function(req) {
    if (req.user) return true;
    if (req.authInfo && req.authInfo.accessToken) return true;
    return false;
  },
  keyFunction: function(req) {
    if (req.user) {
      if (req.authInfo && req.authInfo.client) {
        return req.user.id + ':' + req.authInfo.client.id;
      }

      return req.user.id;
    }

    // Anonymous access tokens
    if (req.authInfo && req.authInfo.accessToken) {
      return req.authInfo.accessToken;
    }

    /* Should never get here */
    return "anonymous";
  },
  redisClient: redisClient
});
