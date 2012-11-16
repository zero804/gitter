/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true, process: false */
"use strict";

var userService = require('../services/user-service');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var ConfirmStrategy = require('../web/confirm-strategy').Strategy;
var winston = require('winston');
var troupeService = require('../services/troupe-service');
var BasicStrategy = require('passport-http').BasicStrategy;
var ClientPasswordStrategy = require('passport-oauth2-client-password').Strategy;
var BearerStrategy = require('passport-http-bearer').Strategy;
var oauthService = require('../services/oauth-service');

function emailPasswordUserStrategy(email, password, done) {
  winston.debug("Attempting to authenticate " + email);
  userService.findByEmail(email, function(err, user) {
    if(err) return done(err);
    if(!user) return done(null, false);

    if(user.status != 'ACTIVE') {
      winston.info("User not yet activated");
      if (user.status != 'PROFILE_NOT_COMPLETED') {
        return done(null, false);
      }
    }

    userService.checkPassword(user, password, function(match) {
      if(!match) return done(null, false);

      if(user.passwordResetCode) {
        user.passwordResetCode = null;
        user.save();
      }

      /* Todo: consider using a seperate object for the security user */
      return done(null, user);

    });
  });
}

module.exports = {
  install: function() {

    passport.serializeUser(function(user, done) {
      done(null, user.id);
    });

    passport.deserializeUser(function(id, done) {
      userService.findById(id, function(err, user) {
        if(err) return done(err);
        if(!user) return done(null, false);

        /* Todo: consider using a seperate object for the security user */
        return done(null, user);
      });

    });

    passport.use(new LocalStrategy({
          usernameField: 'email',
          passwordField: 'password'
        },
        emailPasswordUserStrategy
    ));

    passport.use(new ConfirmStrategy({ name: "confirm" }, function(confirmationCode, done) {
        winston.info("Invoking confirm strategy");

        userService.findByConfirmationCode(confirmationCode, function(err, user) {
          if(err) return done(err);
          if(!user) return done(null, false);

          return done(null, user);
        });
      })
    );

    passport.use(new ConfirmStrategy({ name: "accept" }, function(confirmationCode, done) {
      winston.info("Invoking accept strategy");

      troupeService.findInviteByCode(confirmationCode, function(err, invite) {
        if(err) return done(err);
        if(!invite) return done(null, false);

        if(invite.status != 'UNUSED') {
          return done(null, false);
        }

        userService.findOrCreateUserForEmail({ displayName: invite.displayName, email: invite.email, status: "PROFILE_NOT_COMPLETED" }, function(err, user) {
          return done(null, user);
        });

      });
    })
    );

    passport.use(new ConfirmStrategy({ name: "passwordreset" }, function(confirmationCode, done) {
        userService.findAndUsePasswordResetCode(confirmationCode, function(err, user) {
          if(err) return done(err);
          if(!user) return done(null, false);

          return done(null, user);
        });
      })
    );

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
    passport.use(new BasicStrategy(emailPasswordUserStrategy));

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

    /**
     * BearerStrategy
     *
     * This strategy is used to authenticate users based on an access token (aka a
     * bearer token).  The user must have previously authorized a client
     * application, which is issued an access token to make requests on behalf of
     * the authorizing user.
     */
    passport.use(new BearerStrategy(
      function(accessToken, done) {

        oauthService.findAccessToken(accessToken, function(err, token) {
          if (err) { return done(err); }
          if (!token) { return done(null, false); }

          userService.findById(token.userId, function(err, user) {
            if (err) { return done(err); }
            if (!user) { return done(null, false); }

            // to keep this example simple, restricted scopes are not implemented,
            // and this is just for illustrative purposes
            var info = { scope: '*' };
            done(null, user, info);
          });
        });
      }
    ));
  }
};