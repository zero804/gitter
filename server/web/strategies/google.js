"use strict";

var env = require('gitter-web-env');
var config = env.config;

var Promise = require('bluebird');
var GoogleStrategy = require('passport-google-oauth2').Strategy;
var userService = require('../../services/user-service');
var trackSignupOrLogin = require('../../utils/track-signup-or-login');
var updateUserLocale = require('../../utils/update-user-locale');

function googleOauth2Callback(req, accessToken, refreshToken, params, profile, done) {
  var avatar = profile.photos[0].value; // is this always set?

  var googleUser = {
    username: profile.id+'_google',
    displayName: profile.displayName,
    gravatarImageUrl: avatar
  };
  var googleIdentity = {
    provider: 'google',
    providerKey: profile.id,
    displayName: profile.displayName,
    email: profile.email,
    // Google accessTokens only live one hour.
    accessToken: accessToken,
    // Google will only give you a refreshToken if you ask for offline access
    // and you force an approval prompt. So this will just be undefined for us.
    refreshToken: refreshToken,
    avatar: avatar
  };
  var user;
  return userService.findOrCreateUserForProvider(googleUser, googleIdentity)
    .spread(function(_user, isNewUser) {
      user = _user;

      trackSignupOrLogin(req, user, isNewUser);
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

var googleStrategy = new GoogleStrategy({
    clientID: config.get('googleoauth2:client_id'),
    clientSecret: config.get('googleoauth2:client_secret'),
    callbackURL: config.get('web:basepath') + '/login/google/callback',
    passReqToCallback: true
  }, googleOauth2Callback);

googleStrategy.name = 'google';

module.exports = googleStrategy;
