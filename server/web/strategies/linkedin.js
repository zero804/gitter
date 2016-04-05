"use strict";

var env = require('gitter-web-env');
var config = env.config;

var Promise = require('bluebird');
var LinkedInStrategy = require('passport-linkedin-oauth2').Strategy;
var userService = require('../../services/user-service');
var trackSignupOrLogin = require('../../utils/track-signup-or-login');
var updateUserLocale = require('../../utils/update-user-locale');

function linkedinOauth2Callback(req, accessToken, refreshToken, profile, done) {
  var avatar = profile.photos[0].value; // is this always set?

  var linkedinUser = {
    username: profile.id+'_linkedin',
    displayName: profile.displayName,
    gravatarImageUrl: avatar
  };
  var linkedinIdentity = {
    provider: 'linkedin',
    providerKey: profile.id,
    displayName: profile.displayName,
    email: profile.email,
    // LinkedIn accessTokens only live 60 days
    accessToken: accessToken,
    // appears to be undefined for LinkedIn
    //https://github.com/auth0/passport-linkedin-oauth2/issues/18
    refreshToken: refreshToken,
    avatar: avatar
  };
  var user;
  return userService.findOrCreateUserForProvider(linkedinUser, linkedinIdentity)
    .spread(function(_user, isNewUser) {
      user = _user;

      trackSignupOrLogin(req, user, isNewUser, 'linkedin');
      updateUserLocale(req, user);

      return Promise.fromCallback(function(callback) {
        req.logIn(user, callback);
      });
    })
    .then(function() {
      done(null, user);
    })
    .catch(done);
}

var linkedInStrategy = new LinkedInStrategy({
    clientID: config.get('linkedinoauth2:client_id'),
    clientSecret: config.get('linkedinoauth2:client_secret'),
    callbackURL: config.get('web:basepath') + '/login/linkedin/callback',
    // see https://github.com/auth0/passport-linkedin-oauth2/issues/2
    // (scope only works here and not when calling passport.authorize)
    scope: ['r_basicprofile', 'r_emailaddress'],
    passReqToCallback: true
  }, linkedinOauth2Callback);

linkedInStrategy.name = 'linkedin';

module.exports = linkedInStrategy;
