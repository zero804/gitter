/*jslint node: true */
"use strict";

var passport = require('passport');

module.exports = {
  install: function(app) {
    var auth = passport.authenticate('bearer', { session: false });

    app.all('/api/v1/*', auth);

    app.resource('api/v1/location', require('./location.js'));
  }
};