"use strict";

var env = require('gitter-web-env');
var config = env.config;

var GoogleStrategy = require('passport-google-oauth2').Strategy;
var userService = require('../../services/user-service');

function googleOauth2Callback(req, accessToken, refreshToken, params, profile, done) {
  var avatar = profile.photos[0].value; // is this always set?

  var googleUser = {
    username: profile.id+'_google',
    displayName: profile.displayName,
    emails: [profile.emails.map(function(obj) {return obj.value})],
    googleId: profile.id,
    gravatarImageUrl: avatar
  };
  var googleIdentity = {
    provider: profile.privider, // 'google'
    id: profile.id,
    displayName: profile.displayName,
    accessToken: accessToken,
    refreshToken: refreshToken, // doesn't look like google returns this
    avatar: avatar
  };
  return userService.findOrCreateUserForGoogleId(googleUser, googleIdentity)
    .spread(function(user, identity) {
      req.logIn(user, function(err) {
        if (err) { return done(err); }

        // Remove the old token for this user
        // TODO: this is duplicated code
        req.accessToken = null;
        return done(null, user);
      });
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
