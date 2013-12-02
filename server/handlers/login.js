/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var middleware  = require('../web/middleware');
var passport    = require('passport');

module.exports = {
  install: function(app) {
    // Redirect user to GitHub OAuth authorization page.
    //
    app.get('/login/github',
      function(req, res, next) {
        var requestedScopes = ['public_repo'];
        req.session.githubRequestedScopes = requestedScopes;

        passport.authorize('github', { scope: requestedScopes })(req, res, next);
      },
      function() {});

    app.get(
        '/login',
        function(req, res) {
          var userAgent = req.headers['user-agent'] || '';
          var compactView = userAgent.indexOf("Mobile/") >= 0;
          res.render('login');
        }
      );

    app.get(
        '/login/explain',
        function(req, res) {
          var userAgent = req.headers['user-agent'] || '';
          var compactView = userAgent.indexOf("Mobile/") >= 0;
          res.render('github-explain');
        }
      );

    app.get(
        '/login/upgrade',
        middleware.grantAccessForRememberMeTokenMiddleware,
        middleware.ensureLoggedIn(),
        function(req, res, next) {
          var scopes = req.query.scopes.split(/\s*,\s*/);
          var existing = req.user.githubScopes || { 'user': true, 'user:email': true, 'repo': true };
          var addedScopes = false;

          scopes.forEach(function(scope) {
            if(!existing[scope]) addedScopes = true;
            existing[scope] = true;
          });

          if(!addedScopes) {
            res.render('github-upgrade-complete');
            return;
          }

          var requestedScopes = Object.keys(existing);
          req.session.githubRequestedScopes = requestedScopes;
          req.session.githubScopeUpgrade = true;

          passport.authorize('github', { scope: requestedScopes })(req, res, next);
        }
      );


    // Welcome GitHub users.
    app.get(
      '/login/callback',
      passport.authorize('github', { failureRedirect: '/' }),
      middleware.ensureLoggedIn(),
      middleware.generateRememberMeTokenMiddleware,
      function(req, res) {
        if(req.session.githubScopeUpgrade) {
          delete req.session.githubScopeUpgrade;
          res.render('github-upgrade-complete');
          return;
        }

        res.redirect('/');

        var user = req.user;
        if(user) {
          res.redirect('/' + user.username);
        } else {
          res.redirect('/');
        }
      });

  }
};
