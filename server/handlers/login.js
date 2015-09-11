"use strict";

var env              = require('gitter-web-env');
var stats            = env.stats;
var logger           = env.logger;
var config           = env.config;
var errorReporter    = env.errorReporter;

var passport         = require('passport');
var client           = require("../utils/redis").getClient();
var lock             = require("redis-lock")(client);
var jwt              = require('jwt-simple');
var uuid             = require('node-uuid');
var url              = require('url');
var oauth2           = require('../web/oauth2');
var mixpanel         = require('../web/mixpanelUtils');
var rememberMe       = require('../web/middlewares/rememberme-middleware');
var ensureLoggedIn   = require('../web/middlewares/ensure-logged-in');
var GithubMeService  = require('gitter-web-github').GitHubMeService;
var identifyRoute    = env.middlewares.identifyRoute;
var express          = require('express');

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

var router = express.Router({ caseSensitive: true, mergeParams: true });
router.get('/*', function(req, res, next) {
  // Fix for Windows Phone
  req.nonApiRoute = true;
  next();
});

router.get('/',
  identifyRoute('login'),
  function(req, res) {
    res.render('login', { });
  });

// Redirect user to GitHub OAuth authorization page.
router.get('/github',
  identifyRoute('login-github'),
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
  passport.authorize('github_user', { scope: 'user:email,read:org', failWithError: true }));

router.get('/invited',
  identifyRoute('login-invited'),
  function(req, res) {
    var query = req.query;

    // checks if we have a relative url path and adds it to the session
    if (query.uri) req.session.returnTo = config.get('web:basepath') + '/' + query.uri;

    res.render('login_invited', {
      username: query.welcome,
      uri: query.uri
    });
  });

router.get('/explain',
  identifyRoute('login-explain'),
  function(req, res) {
    res.render('github-explain', {
    });
  });

router.get('/upgrade',
  ensureLoggedIn,
  identifyRoute('login-upgrade'),
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

    passport.authorize('github_upgrade', { scope: requestedScopes, failWithError: true })(req, res, next);
  });

router.get('/upgrade-failed',
  identifyRoute('login-upgrade-failed'),
  function(req, res) {
    res.render('github-upgrade-failed');
  });

router.get('/failed',
  identifyRoute('login-failed'),
  function(req, res) {
    res.render('github-login-failed', {
      message: req.query.message
    });
  });

// Welcome GitHub users.
router.get('/callback',
  identifyRoute('login-callback'),
  function(req, res, next) {
    var code = req.query.code;
    lock("oalock:" + code, function(done) {
      var handler;
      var upgrade = req.session && req.session.githubScopeUpgrade;
      if(upgrade) {
        handler = passport.authorize('github_upgrade', { failWithError: true });
      } else {
        handler = passport.authorize('github_user', { failWithError: true });
      }

      handler(req, res, function(err) {
        done(function() {

          if(err) {
            stats.event("login_failure");

            errorReporter(err, {
              additionalErrorInfo: err.toString(), // passportjs.InternalOAuthError will return additional information in it's toString
              githubCallbackFailed: "failed",
              username: req.user && req.user.username,
              url: req.url,
              userHasSession: !!req.session
            }, { module: 'login-handler' });

            if(upgrade) {
              res.redirect('/login/upgrade-failed');
            } else {
              /* For some reason, the user is now logged in, just continue as normal */
              var user = req.user;
              if(user) {
                if(req.session && req.session.returnTo) {
                  res.redirect(req.session.returnTo);
                } else {
                  res.redirect('/' + user.username);
                }
                return;
              }

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

// ----------------------------------------------------------
// OAuth for our own clients
// ----------------------------------------------------------

// Our clients
router.get('/oauth/authorize',
  identifyRoute('login-oauth-authorize'),
  oauth2.authorization);

router.post('/oauth/authorize/decision',
  identifyRoute('login-oauth-decision'),
  oauth2.decision);

router.post('/oauth/token',
  identifyRoute('login-oauth-token'),
  oauth2.token);

// Wait? Why is this here?
// REMOVE IT: app.post('/oauth/authorize/decision', oauth2.decision);

// Zendesk login callback
router.get("/zendesk",
  ensureLoggedIn,
  identifyRoute('login-zendesk'),
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

module.exports = router;
