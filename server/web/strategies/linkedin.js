"use strict";

var env = require('gitter-web-env');
var config = env.config;

var LinkedInStrategy = require('passport-linkedin-oauth2').Strategy;
var userService = require('../../services/user-service');
var trackSignupOrLogin = require('../track-signup-or-login');
var updateUserLocale = require('../update-user-locale');
var passportLogin = require('../passport-login');

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

  return userService.findOrCreateUserForProvider(linkedinUser, linkedinIdentity)
    .spread(function(user, isNewUser) {
      trackSignupOrLogin(req, user, isNewUser, 'linkedin');
      updateUserLocale(req, user);

      return passportLogin(req, user);
    })
    .asCallback(done);
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
