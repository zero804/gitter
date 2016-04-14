/* jshint node:true  */
"use strict";

var env = require('gitter-web-env');
var winston = env.logger;
var express = require('express');
var http = require('http');
var expressHbs = require('express-hbs');
var passport = require('passport');
var GitHubStrategy = require('gitter-passport-github').Strategy;

var app = express();
var server = http.createServer(app);

app.engine('hbs', expressHbs.express3({
  contentHelperName: 'content'
}));

var RedisStore = require('connect-redis')(express);
var sessionStore = new RedisStore();
app.use(express.cookieParser());
app.use(express.session({
  secret: 'moo',
  store: sessionStore
}));

app.set('view engine', 'hbs');
app.set('views', __dirname);

var oauthScopes = [
  { scope: '', clientID: '554fa86154541b79f8af', clientSecret: '609228d43e4bf832db9460f15ea0412d5b54b052' },
  { scope: 'user', clientID: '0eec7d8032246ffeab59', clientSecret: '8da4e4c5a3279cb2bbb126d1005b174f0cd12eec' },
  { scope: 'user:email', clientID: '6e48a2a0d6b35dab10c3', clientSecret: '03a9cfd1f2c404ea0f4220db2b4637fba39af809' },
  { scope: 'user:follow', clientID: 'a49a2d2fba1725c620aa', clientSecret: 'e56d269d88c39a8edde8a3db08c238a05769c778' },
  { scope: 'public_repo', clientID: '3dcc0425946ab983a5c5', clientSecret: '206f6a338d9f5db4911987613658639656edbd92' },
  { scope: 'repo', clientID: '8ed88d38a06814144888', clientSecret: '7522da0d5c6e35ad4fd7cbfb6addbaef2adfb8e3' },
  { scope: 'repo_deployment', clientID: 'e2405e8edf6bcc6b962b', clientSecret: '345e8c98feb5aa7f3a9a5c961e96c79b12b6ed4b' },
  { scope: 'repo:status', clientID: '8022c8dfbdb973afc849', clientSecret: '2de7036d981445f1f13a61ea3d9440ce3902879d' },
  { scope: 'delete_repo', clientID: 'aec17daeba1594932771', clientSecret: '3e1c48999689fe2cd2228fc886bc4d269d9be95f' },
  { scope: 'notifications', clientID: 'f6808e4803373f54c949', clientSecret: 'ee611db2f83562e9561139c8ec80e33953109f55' },
  { scope: 'gist', clientID: '2f856e65cb802b232bff', clientSecret: '920e91a197bb3eb172c91566e7b134d5660528aa' },
  { scope: 'read:repo_hook', clientID: 'dc252b68de5521bb7abc', clientSecret: '4c81f7448800038b44eb9f850c3e05de1dbdf3a7' },
  { scope: 'write:repo_hook', clientID: 'eaadba5a68a9af06a30f', clientSecret: '10f5a24fed68a93fd9e22875edda61ac50801b58' },
  { scope: 'admin:repo_hook', clientID: '4b980e8696ae03745522', clientSecret: '8aef7f023c9e15dcf81e342fe1e73622240e2dd3' },
  { scope: 'read:public_key', clientID: '66c914dc4630920013be', clientSecret: '3b950c04756dd3a34f8f50a49211f3dc9f962b4f' },
  { scope: 'write:public_key', clientID: '2dbc626740b2530737ff', clientSecret: 'c70ed2e8a0644e8bfe11232651fbb77f6b6851d9' },
  { scope: 'admin:public_key',  clientID: 'ba7203b0a15a7cb98120', clientSecret: '52684e6301b71d93024726bdff060044cd1160d7' },
  { scope: 'read:org',  clientID: '953035b1402f13489208', clientSecret: '6bb190448c65d40e7e5e27e8d01cffc48e3d084f' }
];


function githubOauthCallback(req, accessToken, refreshToken, params, profile, done) {
  var requestedScope = params.scope.split(/,/)[0];
  req.session['token_' + requestedScope] = accessToken;
  done(null, { id: accessToken }, profile);
}

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function deserializeUserCallback(id, done) {
  return done(null, { id: id });
});


oauthScopes.forEach(function(scope) {
  var userStrategy = new GitHubStrategy({
      clientID:     scope.clientID,
      clientSecret: scope.clientSecret,
      callbackURL:  'http://localhost:8081/login/callback',
      passReqToCallback: true
  }, githubOauthCallback);
  userStrategy.name = 'github_' + scope.scope;
  passport.use(userStrategy);
});


app.use(passport.initialize());

app.get('/auth',
  function(req, res, next) {
    req.session.currentScope = req.query.scope;
    passport.authorize('github_' + req.query.scope, { scope: req.query.scope, failWithError: true })(req, res, next);
  });

// Welcome GitHub users.
app.get(
  '/login/callback',
  function(req, res, next) {
    var scope = req.session.currentScope;
    passport.authorize('github_' + scope, { failWithError: true })(req, res, next);
  },
  function(req, res) {
    res.redirect('/');
  });

app.get('/', function(req, res) {

  var scopes = oauthScopes.map(function(s) {
    return {
      oauthScope: s.scope,
      token: req.session['token_' + s.scope]
    };
  });

  res.render('page.hbs', {
    scopes: scopes
  });

});

var port = 8081;
server.listen(port, function() {
  winston.info("Listening on " + port);
});
