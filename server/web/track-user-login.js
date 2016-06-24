"use strict";

var env = require('gitter-web-env');
var stats = env.stats;

var _ = require('lodash');
var emailAddressService = require('../services/email-address-service');
var useragentTagger = require('./user-agent-tagger');

// Use this whenever a user logs in again
module.exports = function trackUserLogin(req, user, provider) {
  return emailAddressService(user)
    .then(function(email) {
      var properties = useragentTagger(req);

      // this is only set because stats.userUpdate requires it
      user.email = email;
      stats.userUpdate(user, properties);

      // NOTE: other stats calls also pass in source and googleAnalyticsUniqueId
      stats.event("user_login", _.extend({
        userId: user.id,
        method: provider + '_oauth',
        username: user.username
      }, properties));
    });
}
