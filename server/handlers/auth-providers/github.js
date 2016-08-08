'use strict'

var env = require('gitter-web-env');
var identifyRoute = env.middlewares.identifyRoute;
var config = env.config;

var passport = require('passport');
var trackLoginForProvider = require('../../web/middlewares/track-login-for-provider');
var rememberMe = require('../../web/middlewares/rememberme-middleware');
var ensureLoggedIn = require('../../web/middlewares/ensure-logged-in');
var redirectAfterLogin = require('../../web/middlewares/redirect-after-login');
var passportCallbackForStrategy = require('../../web/middlewares/passport-callback-for-strategy');
var userScopes = require('gitter-web-identity/lib/user-scopes');

var routes = {};

routes.login = [
  identifyRoute('login-github'),
  trackLoginForProvider('github'),
  passport.authorize('github_user', {
    scope: 'user:email,read:org',
    failWithError: true
  })
];

routes.invited = [
  identifyRoute('login-invited'),
  function(req, res) {
    var query = req.query;

    // checks if we have a relative url path and adds it to the session
    if (query.uri) req.session.returnTo = config.get('web:basepath') + '/' + query.uri;

    res.render('login_invited', {
      username: query.welcome,
      uri: query.uri,
      bootScriptName: 'router-login',
      cssFileName:  "styles/login.css",
      // TODO: remove this and just show it anyway
      showNewLogin: true
    });
  }
];

routes.explain = [
  identifyRoute('login-explain'),
  function(req, res) {
    res.render('github-explain', {
    });
  }
];

routes.upgrade = [
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
      res.render('github-upgrade-complete', {
        oAuthCompletePostMessage: JSON.stringify({
          type: "oauth_upgrade_complete",
          scopes: userScopes.getScopesHash(req.user)
        })
      });
      return;
    }

    var requestedScopes = Object.keys(existing).filter(function(f) { return !!f; });
    req.session.githubScopeUpgrade = true;

    passport.authorize('github_upgrade', {
      scope: requestedScopes,
      failWithError: true
    })(req, res, next);
  }
];

routes.callback = [
  identifyRoute('login-callback'),
  function(req, res, next) {
    var upgrade = req.session && req.session.githubScopeUpgrade;
    var strategy;
    if (upgrade) {
      strategy = 'github_upgrade';
    } else {
      strategy = 'github_user';
    }
    passportCallbackForStrategy(strategy, { failWithError: true })(req, res, next);
  },
  ensureLoggedIn,
  rememberMe.generateRememberMeTokenMiddleware,
  redirectAfterLogin
];

module.exports = routes;
