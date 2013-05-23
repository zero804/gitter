/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var userService = require('../services/user-service');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var ConfirmStrategy = require('./confirm-strategy').Strategy;
var winston = require('winston');
var troupeService = require('../services/troupe-service');
var BasicStrategy = require('passport-http').BasicStrategy;
var ClientPasswordStrategy = require('passport-oauth2-client-password').Strategy;
var BearerStrategy = require('passport-http-bearer').Strategy;
var oauthService = require('../services/oauth-service');
var statsService = require("../services/stats-service");
var nconf = require('../utils/config');
var loginUtils = require("../web/login-utils");

function emailPasswordUserStrategy(email, password, done) {
  winston.verbose("Attempting to authenticate ", { email: email });

  userService.findByEmail(email, function(err, user) {
    if(err) return done(err);
    if(!user) {
      winston.warn("Unable to login as email address not found", { email: email });

      statsService.event("login_failed", {
        email: email,
        reason: 'email_not_found'
      });

      return done(null, null, { reason: "login_failed" });
    }

    if(user.status != 'ACTIVE' && user.status != 'PROFILE_NOT_COMPLETED') {
      winston.warn("User attempted to login but account not yet activated", { email: email, status: user.status });

      statsService.event("login_failed", {
        email: email,
        reason: 'account_not_activated'
      });

      return done(null, null, { reason: "account_not_activated" });
    }

    userService.checkPassword(user, password, function(match) {
      if(!match) {
        winston.warn("Login failed. Passwords did not match", { email: email });

        statsService.event("login_failed", {
          email: email,
          reason: 'password_mismatch'
        });

        return done(null, null, { reason: "login_failed" });
      }

      if(user.passwordResetCode) {
        winston.warn("Login successful but user has password reset code. Deleting password reset.", { email: email });

        user.passwordResetCode = null;
        user.save();
      }

      statsService.event("user_login", {
        userId: user.id
      });

      /* Todo: consider using a seperate object for the security user */
      return done(null, user);

    });
  });
}

var inviteAcceptStrategy = new ConfirmStrategy({ name: "accept" }, function(confirmationCode, req, done) {
  var self = this;

  var troupeUri = req.params.troupeUri || req.params.appUri;

  winston.verbose("Invoking accept strategy", { confirmationCode: confirmationCode, troupeUri: troupeUri });

  troupeService.acceptInvite(confirmationCode, troupeUri, function(err, user, alreadyUsed) {
    if(err || !user) {
      return self.redirect('/' + req.params.troupeUri + (alreadyUsed ? '#existing' : ''));
    }

    return done(null, user);
  });

});

module.exports = {
  install: function() {

    passport.serializeUser(function(user, done) {
      done(null, user.id);
    });

    passport.deserializeUser(function deserializeUserCallback(id, done) {
      userService.findById(id, function findUserByIdCallback(err, user) {
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

    passport.use(new ConfirmStrategy({ name: "confirm" }, function(confirmationCode, req, done) {
      var self = this;
      var troupeUri = req.params.appUri || req.params.troupeUri;

      winston.verbose("Confirming user with code", { confirmationCode: confirmationCode });

      userService.findByConfirmationCode(confirmationCode, function(err, user) {
        if(err) return done(err);
        if(!user) {
          // If the confirmation was under an appUri ala /:appUri/confirm/:confirmCode
          // Then always use that URI
          if(troupeUri) {
            return self.redirect("/" + troupeUri);
          }

          return done(null, false);
        }

        // if the user is unconfirmed, then confirm them
        // if the user has been confirmed, but hasn't populated their profile, we want to go down the same path
        if (user.status == 'UNCONFIRMED' || user.status == 'PROFILE_NOT_COMPLETED' || user.newEmail) {
          statsService.event('confirmation_completed', { userId: user.id });
          return done(null, user);
        } else {
          // confirmation fails if the user is already confirmed, except when the user is busy confirming their new email address
          statsService.event('confirmation_reused', { userId: user.id });

          winston.verbose("Confirmation already used", { confirmationCode: confirmationCode });

          // If the confirmation was under an appUri ala /:appUri/confirm/:confirmCode
          // Then always use that URI
          if(troupeUri) {
            return self.redirect("/" + troupeUri);
          }


          loginUtils.whereToNext(user, function(err, url) {
            if(err || !url) return self.redirect(nconf.get('web:homeurl'));

            return self.redirect(url);
          });

        }

      });
    })
  );

  passport.use(inviteAcceptStrategy);

  passport.use(new ConfirmStrategy({ name: "passwordreset" }, function(confirmationCode, req, done) {
      userService.findAndUsePasswordResetCode(confirmationCode, function(err, user) {
        if(err) return done(err);
        if(!user) {
          statsService.event('password_reset_invalid', { confirmationCode: confirmationCode });
          return done(null, false);
        }

        statsService.event('password_reset_completed', { userId: user.id });

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
          if (err) {
            winston.error("passport: Access token find failed", { exception: err });
            return done(err);
          }

          if (!token) {
            winston.info("passport: Access token presented does not exist", { exception: err });
            return done(null, false);
          }

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
  },

  testOnly: {
    inviteAcceptStrategy: inviteAcceptStrategy
  }

};