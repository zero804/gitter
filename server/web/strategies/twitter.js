"use strict";

var env = require('gitter-web-env');
var config = env.config;

var Promise = require('bluebird');
var TwitterStrategy = require('passport-twitter');
var userService = require('../../services/user-service');
var trackSignupOrLogin = require('../../utils/track-signup-or-login');
var updateUserLocale = require('../../utils/update-user-locale');

//function twitterOauthCallback(req, accessToken, refreshToken, params, profile, done) {
function twitterOauthCallback(req, token, tokenSecret, profile, done) {
  var avatar = profile.photos[0].value; // is this always set?

  var twitterUser = {
    username: profile.username+'_twitter',
    displayName: profile.displayName,
    gravatarImageUrl: avatar
  };
  var twitterIdentity = {
    provider: 'twitter',
    providerKey: profile.id,
    displayName: profile.displayName,
    // NOTE: doesn't look like passport is parsing out the email address if we
    // set userProfileURL for some reason. So profile.email is not set.
    email: profile._json.email,
    accessToken: token,
    accessTokenSecret: tokenSecret,
    avatar: avatar
  };
  var user;
  return userService.findOrCreateUserForProvider(twitterUser, twitterIdentity)
    .spread(function(_user, isNewUser) {
      user = _user;

      trackSignupOrLogin(req, user, isNewUser, 'twitter');
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

var twitterStrategy = new TwitterStrategy({
    consumerKey: config.get('twitteroauth:consumer_key'),
    consumerSecret: config.get('twitteroauth:consumer_secret'),
    userProfileURL: "https://api.twitter.com/1.1/account/verify_credentials.json?include_email=true",
    callbackURL: config.get('web:basepath') + '/login/twitter/callback',
    passReqToCallback: true
  }, twitterOauthCallback);

twitterStrategy.name = 'twitter';

module.exports = twitterStrategy;
