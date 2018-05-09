"use strict";

var env = require('gitter-web-env');
var config = env.config;

var GitLabStrategy = require('passport-gitlab2');
var userService = require('../../services/user-service');
var trackSignupOrLogin = require('../track-signup-or-login');
var updateUserLocale = require('../update-user-locale');
var passportLogin = require('../passport-login');
var identityService = require('gitter-web-identity');
var callbackUrlBuilder = require('./callback-url-builder');

function gitlabOauthCallback(req, token, tokenSecret, profile, done) {
  var gitlabUser = {
    username: profile.username+'_gitlab',
    displayName: profile.displayName,
    gravatarImageUrl: profile.avatarUrl
  };
  var gitlabIdentity = {
    provider: identityService.GITLAB_IDENTITY_PROVIDER,
    providerKey: profile.id,
    username: profile.username,
    displayName: profile.displayName,
    email: profile._json.email,
    accessToken: token,
    accessTokenSecret: tokenSecret.access_token,
    avatar: profile.avatarUrl
  };

  return userService.findOrCreateUserForProvider(gitlabUser, gitlabIdentity)
    .spread(function(user, isNewUser) {

      trackSignupOrLogin(req, user, isNewUser, 'gitlab');
      updateUserLocale(req, user);

      return passportLogin(req, user);
    })
    .asCallback(done);
}

var gitlabStrategy = new GitLabStrategy({
    clientID: config.get('gitlaboauth:client_id'),
    clientSecret: config.get('gitlaboauth:client_secret'),
    callbackURL: callbackUrlBuilder('gitlab'),
    passReqToCallback: true
  }, gitlabOauthCallback);

gitlabStrategy.name = 'gitlab';

module.exports = gitlabStrategy;
