/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var dolph       = require('dolph');
var redis       = require("../../utils/redis");
var redisClient = redis.createClient();

module.exports = dolph({
  prefix: 'rate:',
  limit: 100,
  expiry: 60,
  applyLimit: function(req) {
    return !!(req.user && req.authInfo && req.authInfo.client);
  },
  keyFunction: function(req) {
    return req.user.id + ':' + req.authInfo.client.id;
  },
  redisClient: redisClient
});
