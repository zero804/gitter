"use strict";

var env = require('gitter-web-env');
var config = env.config;

var GitHubStrategy = require('gitter-passport-github').Strategy;
var TokenStateProvider = require('gitter-passport-oauth2').TokenStateProvider;
var githubOauthCallback = require('./github-oauth-callback');

var githubUpgradeStrategy = new GitHubStrategy({
    clientID: config.get('github:client_id'),
    clientSecret: config.get('github:client_secret'),
    callbackURL: config.get('web:basepath') + '/login/callback',
    stateProvider: new TokenStateProvider({ passphrase: config.get('github:statePassphrase') }),
    skipUserProfile: true,
    passReqToCallback: true
  }, githubOauthCallback);

githubUpgradeStrategy.name = 'github_upgrade';

module.exports = githubUpgradeStrategy;
