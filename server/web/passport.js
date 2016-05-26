"use strict";

var env = require('gitter-web-env');
var logger = env.logger;

var passport = require('passport');
var ClientPasswordStrategy = require('passport-oauth2-client-password').Strategy;
var BearerStrategy = require('gitter-passport-http-bearer').Strategy;
var userService = require('../services/user-service');
var oauthService = require('../services/oauth-service');
var githubUserStrategy = require('./strategies/github-user');
var githubUpgradeStrategy = require('./strategies/github-upgrade');
var googleStrategy = require('./strategies/google');
var twitterStrategy = require('./strategies/twitter');
var linkedinStrategy = require('./strategies/linkedin');


function installApi() {
  /**
   * BearerStrategy
   *
   * This strategy is used to authenticate users based on an access token (aka a
   * bearer token).  The user must have previously authorized a client
   * application, which is issued an access token to make requests on behalf of
   * the authorizing user.
   */

  /* This is ONLY used to API clients, not WEB clients!! */
  passport.use(new BearerStrategy(
    function(accessToken, done) {
      return oauthService.validateAccessTokenAndClient(accessToken)
        .then(function(tokenInfo) {
          // Token not found
          if(!tokenInfo) return done();

          var user = tokenInfo.user;
          var client = tokenInfo.client;

          if (!client) return done();

          if (!user) {
            /* This will be converted to null in auth-api.js */
            user = { _anonymous: true };
          }
          // Not yet needed var accessToken = tokenInfo.accessToken;
          done(null, user, { client: client, accessToken: accessToken });
        })
        .catch(done);
    }
  ));
}



function install() {
  passport.serializeUser(function(user, done) {
    done(null, user.id);
  });

  passport.deserializeUser(function deserializeUserCallback(id, done) {
    userService.findById(id, function findUserByIdCallback(err, user) {
      if(err) {
        logger.error('Unable to deserialize user ' + err, { exception: err });
        return done(err);
      }

      if(!user) {
        logger.error('Unable to deserialize user ' + id + '. Not found.');
        /* For some reason passport wants a null here */
        return done(null, null);
      }

      /* Todo: consider using a seperate object for the security user */
      return done(null, user);
    });

  });


  /* OAuth Strategies */


  /**
   * BasicStrategy & ClientPasswordStrategy
   *
   * These strategies are used to authenticate registered OAuth clients.  They are
   * employed to protect the `token` endpoint, which consumers use to obtain
   * access tokens.  The OAuth 2.0 specification suggests that clients use the
   * HTTP Basic scheme to authenticate.  Use of the client password strategy
   * allows clients to send the same credentials in the request body (as opposed
   * to the `Authorization` header).  While this approach is not recommended by
   * the specification, in practice it is quite common.
   */

  passport.use(new ClientPasswordStrategy(
    function(clientKey, clientSecret, done) {
      oauthService.findClientByClientKey(clientKey, function(err, client) {
        if (err) { return done(err); }
        if (!client) { return done(null, false); }
        if (client.clientSecret != clientSecret) { return done(null, false); }

        return done(null, client);
      });
    }
  ));

  /* Install the API OAuth strategy too */
  installApi();

  passport.use(githubUserStrategy);
  passport.use(githubUpgradeStrategy);
  passport.use(googleStrategy);
  passport.use(twitterStrategy);
  passport.use(linkedinStrategy);
}

module.exports = {
  installApi: installApi,
  install: install
};
