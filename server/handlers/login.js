/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var middleware  = require('../web/middleware');
var passport    = require('passport');
var winston     = require('winston');
var client      = require("../utils/redis").createClient();
var lock        = require("redis-lock")(client);
var oauth2      = require('../web/oauth2');

module.exports = {
  install: function(app) {
    // Redirect user to GitHub OAuth authorization page.
    //
    app.get('/login/github',
      function(req, res, next) {
        passport.authorize('github_user', { scope: 'user' })(req, res, next);
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
          var scopes = req.query.scopes ? req.query.scopes.split(/\s*,\s*/) : [''];
          scopes.push('user'); // Always request user-scope
          var existing = req.user.githubScopes || { };
          var addedScopes = false;

          scopes.forEach(function(scope) {
            if(!existing[scope]) addedScopes = true;
            existing[scope] = true;
          });

          if(!addedScopes) {
            res.render('github-upgrade-complete');
            return;
          }

          var requestedScopes = Object.keys(existing).filter(function(f) { return !!f; });
          req.session.githubScopeUpgrade = true;

          passport.authorize('github_upgrade', { scope: requestedScopes })(req, res, next);
        }
      );

    app.get(
      '/login/upgrade-failed',
      function(req, res) {
        res.render('github-upgrade-failed');
      });

    // Welcome GitHub users.
    app.get(
      '/login/callback',
      function(req, res, next) {
        var code = req.query.code;

        lock("oalock:" + code, function(done) {

            var handler;
            if(req.session.githubScopeUpgrade) {
              handler = passport.authorize('github_upgrade', { failureRedirect: '/login/upgrade-failed' });
            } else {
              handler = passport.authorize('github_user', { failureRedirect: '/' });
            }

            handler(req, res, function(err) {
              done();
              next(err);
            });

        });


      },

      middleware.ensureLoggedIn(),
      middleware.generateRememberMeTokenMiddleware,
      function(req, res) {
        if(req.session.githubScopeUpgrade) {
          delete req.session.githubScopeUpgrade;
          res.render('github-upgrade-complete');
          return;
        }

        if(req.session.returnTo) {
          res.redirect(req.session.returnTo);
          return;
        }

        var user = req.user;
        if(user) {
          res.redirect('/' + user.username);
        } else {
          res.redirect('/');
        }
      });

    app.get(
      '/login/callback',
      /* 4-nary error handler for /login/callback */
      function(err, req, res, next) {
        winston.error("OAuth failed: " + err);
        if(err.stack) {
          winston.error("OAuth failure callback", err.stack);
        }
        res.redirect("/");
      });


    // ----------------------------------------------------------
    // OAuth for our own clients
    // ----------------------------------------------------------

    // Our clients
    app.get('/login/oauth/authorize', oauth2.authorization);
    app.post('/login/oauth/authorize/decision', oauth2.decision);
    app.post('/login/oauth/token', oauth2.token);

    app.get('/login/oauth/callback', function(req, res) {
      res.send(200, 'Can I help you with something?');
    });

  }
};
