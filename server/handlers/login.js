/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var middleware  = require('../web/middleware');
var passport    = require('passport');

module.exports = {
  install: function(app) {

    // TODO: Add state and crosscheck when the oauth callback returns.
    var signupOptions = { scope: ['user:email', 'repo'] };

    // Redirect user to GitHub OAuth authorization page.
    //
    app.get('/login/github',
      passport.authorize('github', signupOptions),
      function() {});

    app.get(
        '/login',
        function(req, res) {
          var userAgent = req.headers['user-agent'] || '';
          var compactView = userAgent.indexOf("Mobile/") >= 0;
          res.render('login');
        }
      );

    // Welcome GitHub users.
    app.get(
      '/login/callback',
      passport.authorize('github', { failureRedirect: '/' }),
      middleware.ensureLoggedIn(),
      middleware.generateRememberMeTokenMiddleware,
      function(req, res) {
        res.redirect('/');
      });

  }
};
