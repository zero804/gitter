/*jslint node: true */
"use strict";

var passport = require('passport');

module.exports = {
  install: function(app) {
    var auth = passport.authenticate('bearer', { session: false });

    app.all('/api/v1/location', auth);
    app.resource('api/v1/location', require('./location.js'));

    /* APN has no auth requirement as user may not have authenticated */
    app.resource('api/v1/apn', require('./apn.js'));

    app.all('/api/v1/userapn', auth);
    app.resource('api/v1/userapn', require('./userapn.js'));

  }
};