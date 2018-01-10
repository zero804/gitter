"use strict";

var env = require('gitter-web-env');
var stats = env.stats;

var emailAddressService = require('gitter-web-email-addresses');
var gaCookieParser = require('./ga-cookie-parser');

// Use this whenever a user first signs up.
module.exports = function trackNewUser(req, user, provider) {
  // NOTE: tracking a signup after an invite is separate to this
  emailAddressService(user)
    .then(function(email) {
      user.emails = [email];

      stats.userUpdate(Object.assign({}, user, {
        // this is only set because stats.userUpdate requires it
        email: email
      }));

      // NOTE: other stats calls also pass in properties
      stats.event("new_user", {
        userId: user.id,
        email: email,
        method: provider + '_oauth',
        username: user.username,
        source: req.session.source,
        googleAnalyticsUniqueId: gaCookieParser(req)
      });

      // Persist the new emails
      return user.save();
    });
};
