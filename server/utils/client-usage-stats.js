"use strict";

var dolph = require('dolph');
var env = require('gitter-web-env');
var stats = env.stats;
var redisClient = env.redis.getClient();

var rateLimiter = dolph.rateLimiter({
  prefix: 'cu:',
  redisClient: redisClient
});

var RATE = 86400 / 4;

module.exports = {

  record: function (user, client) {
    if(user && client) {
      var userId = user.id;
      var clientId = client.id;

      rateLimiter(user.id + ':' + clientId, RATE, function(err, count) {

        // First time in the window period? Record it
        if(count === 1) {
          if (client.tag) {
            var properties = {};
            properties['Last login from ' + client.tag] = new Date();
            stats.userUpdate(user, properties);
          }

          stats.event('client.access', { userId: userId, clientName: client.name, clientId: client.name, tag: client.tag });
        }
      });
    }
  }

};
