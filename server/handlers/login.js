/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var middleware    = require('../web/middleware');
var passport      = require('passport');
var winston       = require('../utils/winston');
var client        = require("../utils/redis").createClient();
var lock          = require("redis-lock")(client);
var oauth2        = require('../web/oauth2');
var mixpanel      = require('../web/mixpanelUtils');
var statsService  = require("../services/stats-service");
var languageSelector = require('../web/language-selector');

module.exports = {
  install: function(app) {
    // Redirect user to GitHub OAuth authorization page.
    //
    app.get('/login/github',
      function(req, res, next) {
        //send data to stats service
        if (req.query.action == 'login') {
          statsService.event("login_clicked", {
            distinctId: mixpanel.getMixpanelDistinctId(req.cookies),
            method: 'github_oauth'
          });
        }
        if (req.query.action == 'signup') {
          statsService.event("signup_clicked", {
            distinctId: mixpanel.getMixpanelDistinctId(req.cookies),
            method: 'github_oauth',
            button: req.query.button
          });
        }
        passport.authorize('github_user', { scope: 'user:email,read:org' })(req, res, next);
      },
      function() {});

    app.get(
        '/login',
        function(req, res) {
          res.render('login', {
            lang: languageSelector(req)
          });
        }
      );

    app.get(
        '/login/explain',
        function(req, res) {
          res.render('github-explain', {
            lang: languageSelector(req)
          });
        }
      );

    app.get(
        '/login/upgrade',
        middleware.ensureLoggedIn(),
        function(req, res, next) {
          var scopes = req.query.scopes ? req.query.scopes.split(/\s*,\s*/) : [''];
          scopes.push('user:email');  // Always request user:email scope
          scopes.push('read:org');    // Always request read-only access to orgs
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

    app.get(
      '/login/failed',
      function(req, res) {
        res.render('github-login-failed', {
          message: req.query.message
        });
      });

    // Welcome GitHub users.
    app.get(
      '/login/callback',
      function(req, res, next) {
        var code = req.query.code;
        lock("oalock:" + code, function(done) {

            var handler;
            var upgrade = req.session && req.session.githubScopeUpgrade;
            if(upgrade) {
              handler = passport.authorize('github_upgrade');
            } else {
              handler = passport.authorize('github_user');
            }

            handler(req, res, function(err) {
              done();

              if(err) {
                if(upgrade) {
                  res.redirect('/login/upgrade-failed');
                } else {
                  if(err.message) {
                    res.redirect('/login/failed?message=' + encodeURIComponent(err.message));
                  } else {
                    res.redirect('/login/failed');
                  }
                }
                return;
              }

              next();
            });

        });
      },

      middleware.ensureLoggedIn(),
      middleware.generateRememberMeTokenMiddleware,
      function(req, res) {
        if(req.session && req.session.githubScopeUpgrade) {
          delete req.session.githubScopeUpgrade;
          res.render('github-upgrade-complete');
          return;
        }

        if(req.session && req.session.returnTo) {
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

    app.post('/oauth/authorize/decision', oauth2.decision);


    app.get('/login/oauth/callback', function(req, res) {
      res.send(200, 'Can I help you with something?');
    });

  }
};
