"use strict";

var env = require('gitter-web-env');
var stats = env.stats;

var emailAddressService = require('../services/email-address-service');
var gaCookieParser = require('./ga-cookie-parser');

// Use this whenever a user first signs up.
module.exports = function trackNewUser(req, user, provider) {
  // NOTE: tracking a signup after an invite is separate to this
  emailAddressService(user)
    .then(function(email) {
      // this is only set because stats.userUpdate requires it
      user.email = email;
      stats.userUpdate(user);

      // NOTE: other stats calls also pass in properties
      stats.event("new_user", {
        userId: user.id,
        email: email,
        method: provider + '_oauth',
        username: user.username,
        source: req.session.source,
        googleAnalyticsUniqueId: gaCookieParser(req)
      });
    });
};
