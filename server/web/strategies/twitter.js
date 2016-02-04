"use strict";

var env = require('gitter-web-env');
var config = env.config;

var Q = require('bluebird-q');
var TwitterStrategy = require('passport-twitter');
var userService = require('../../services/user-service');
var trackSignupOrLogin = require('../../utils/track-signup-or-login');
var updateUserLocale = require('../../utils/update-user-locale');

//function twitterOauthCallback(req, accessToken, refreshToken, params, profile, done) {
function twitterOauthCallback(req, token, tokenSecret, profile, done) {
  var avatar = profile.photos[0].value; // is this always set?

  var twitterUser = {
    username: profile.id+'_twitter', // OR profile.username+'_twitter'
    displayName: profile.displayName,
    gravatarImageUrl: avatar
  };
  var twitterIdentity = {
    provider: 'twitter',
    providerKey: profile.id,
    displayName: profile.displayName,
    email: profile.email,
    accessToken: token,
    accessTokenSecret: tokenSecret,
    avatar: avatar
  };
  var user;
  return userService.findOrCreateUserForProvider(twitterUser, twitterIdentity)
    .spread(function(_user, isNewUser) {
      user = _user;

      trackSignupOrLogin(req, user, isNewUser);
      updateUserLocale(req, user);

      // blegh
      var deferred = Q.defer();
      req.logIn(user, function(err) {
        if (err) {
          deferred.reject(err);
        } else {
          deferred.resolve();
        }
      });
      return deferred.promise;
    })
    .then(function() {
      done(null, user);
    })
    .catch(done);
}

var twitterStrategy = new TwitterStrategy({
    consumerKey: config.get('twitteroauth:consumer_key'),
    consumerSecret: config.get('twitteroauth:consumer_secret'),
    callbackURL: config.get('web:basepath') + '/login/twitter/callback',
    passReqToCallback: true
  }, twitterOauthCallback);

twitterStrategy.name = 'twitter';

module.exports = twitterStrategy;
