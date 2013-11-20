/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var nconf       = require('../utils/config');
var middleware  = require('../web/middleware');
var passport    = require('passport');

module.exports = {
  install: function(app) {

    // TODO: Add state and crosscheck when the oauth callback returns.
    var signupOptions = { scope: ['user:email'] };

    // Redirect user to GitHub OAuth authorization page.
    //
    app.get('/github/signup',
      passport.authorize('github', signupOptions),
      function() {});

    // Welcome GitHub users.
    //
    app.get(
      '/github/callback',
      passport.authorize('github', { failureRedirect: '/' }),
      middleware.ensureLoggedIn(),
      function(req, res) {
        res.redirect('/');
      });

  }
}
