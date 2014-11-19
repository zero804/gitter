/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var env            = require('../utils/env');
var stats          = env.stats;
var logger         = env.logger;
var config         = env.config;

var passport       = require('passport');
var client         = require("../utils/redis").getClient();
var lock           = require("redis-lock")(client);
var jwt            = require('jwt-simple');
var uuid           = require('node-uuid');
var url            = require('url');
var oauth2         = require('../web/oauth2');
var mixpanel       = require('../web/mixpanelUtils');
var rememberMe     = require('../web/middlewares/rememberme-middleware');
var ensureLoggedIn = require('../web/middlewares/ensure-logged-in');
var GithubMeService  = require("../services/github/github-me-service");

/** TODO move onto its own method once we find the need for it elsewhere
 * isRelativeURL() checks if the URL is relative
 *
 * url      String - the url to be check
 * @return  Boolean - the result of the check
 */
function isRelativeURL(url) {
  var relativeUrl = new RegExp('^\/[^/]');
  return relativeUrl.test(url);
}

module.exports = {
  install: function(app) {
    // Redirect user to GitHub OAuth authorization page.
    app.get('/login/github',
      function (req, res, next) {
        var query = req.query;

        // adds the source of the action to the session (for tracking how users 'come in' to the app)
        req.session.source = query.source;

        // checks if we have a relative url path and adds it to the session
        if (query.returnTo && isRelativeURL(query.returnTo)) {
          req.session.returnTo = query.returnTo;
        }

        //send data to stats service
        if (query.action == 'login') {
          stats.event("login_clicked", {
            distinctId: mixpanel.getMixpanelDistinctId(req.cookies),
            method: 'github_oauth',
            button: query.source
          });
        }
        if (query.action == 'signup') {
          stats.event("signup_clicked", {
            distinctId: mixpanel.getMixpanelDistinctId(req.cookies),
            method: 'github_oauth',
            button: query.source
          });
        }
        next();
      },
      passport.authorize('github_user', { scope: 'user:email,read:org' })
    );

    app.get(
        '/login',
        function(req, res) {
          res.render('login', {
          });
        }
      );

    app.get(
        '/login/invited',
        function(req, res) {
          var query = req.query;

          // checks if we have a relative url path and adds it to the session
          if (query.uri) req.session.returnTo = config.get('web:basepath') + '/' + query.uri;

          res.render('login_invited', {
            username: query.welcome,
            uri: query.uri
          });
        }
      );

    app.get(
        '/login/explain',
        function(req, res) {
          res.render('github-explain', {
          });
        }
      );

    app.get(
        '/login/upgrade',
        ensureLoggedIn,
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

      ensureLoggedIn,
      rememberMe.generateRememberMeTokenMiddleware,
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
      function(err, req, res, /* DO NOT DELETE THIS */ next /* DO NOT DELETE THIS! */) {
        logger.error("OAuth failed: " + err);
        if(err.stack) {
          logger.error("OAuth failure callback", err.stack);
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

    // Wait? Why is this here?
    // REMOVE IT: app.post('/oauth/authorize/decision', oauth2.decision);

    // Zendesk login callback
    app.get(
      "/login/zendesk",
      ensureLoggedIn,
      function(req, res, next) {
        var ghMe = new GithubMeService(req.user);
        ghMe.getEmail()
        .then(function(email) {
          var cfg = config.get("zendesk");
          var payload = {
            "iat": (new Date().getTime() / 1000),
            "jti": uuid.v4(),
            "name": req.user.displayName,
            "email": email,
            "external_id": req.user.id,
            "remote_photo_url": "https://avatars.githubusercontent.com/" + req.user.username,
            "user_fields": {
              "username": req.user.username
            }
          };

          logger.info("Sending data to Zendesk", payload);

          var token = jwt.encode(payload, cfg.sharedKey);
          var redirect = "https://" + cfg.subdomain + ".zendesk.com/access/jwt?jwt=" + token;

          var query = url.parse(req.url, true).query;

          if(query.return_to) {
            redirect += "&return_to=" + encodeURIComponent(query.return_to);
          }

          res.redirect(redirect);
        })
        .catch(next);
    });

  }
};
