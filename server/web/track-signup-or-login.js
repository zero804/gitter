"use strict";

var env = require('gitter-web-env');
var stats = env.stats;
var logger = env.logger;

var trackNewUser = require('./track-new-user');
var trackUserLogin = require('./track-user-login');
var mixpanel = require('./mixpanelUtils');


module.exports = function trackSignupOrLogin(req, user, isNewUser, provider) {
  if (isNewUser) {
    stats.alias(mixpanel.getMixpanelDistinctId(req.cookies), user.id, function(err) {
      if (err) logger.error('Error aliasing user:', { exception: err });
      trackNewUser(req, user, provider);
    });
  } else {
    trackUserLogin(req, user, provider);
  }
}
