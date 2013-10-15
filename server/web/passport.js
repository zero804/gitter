/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var _                       = require('underscore');
var userService             = require('../services/user-service');
var passport                = require('passport');
var LocalStrategy           = require('passport-local').Strategy;
var ConfirmStrategy         = require('./confirm-strategy').Strategy;
var winston                 = require('winston');
var BasicStrategy           = require('passport-http').BasicStrategy;
var ClientPasswordStrategy  = require('passport-oauth2-client-password').Strategy;
var BearerStrategy          = require('passport-http-bearer').Strategy;
var oauthService            = require('../services/oauth-service');
var statsService            = require("../services/stats-service");
var nconf                   = require('../utils/config');
var loginUtils              = require("../web/login-utils");
var GoogleStrategy          = require('passport-google-oauth').OAuth2Strategy;
var useragentStats          = require('./useragent-stats');

function loginAndPasswordUserStrategy(req, login, password, done) {
  winston.verbose("Attempting to authenticate ", { email: email });

  var email = login;
  // var username = login;

  userService.findByLogin(login, function(err, user) {
    if(err) return done(err);
    if(!user) {
      winston.warn("Unable to login as email address or username not found", { login: login });

      statsService.event("login_failed", {
        email: email,
        reason: 'email_not_found'
      });

      return done(null, null, { reason: "login_failed" });
    }

    if(user.status != 'ACTIVE' && user.status != 'PROFILE_NOT_COMPLETED') {
      winston.warn("User attempted to login but account not yet activated", { email: email, status: user.status });

      statsService.event("login_failed", {
        userId: user.id,
        email: email,
        reason: 'account_not_activated'
      });

      return done(null, null, { reason: "account_not_activated" });
    }

    userService.checkPassword(user, password, function(match) {
      if(!match) {
        winston.warn("Login failed. Passwords did not match", { email: email });

        statsService.event("login_failed", {
          userId: user.id,
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

      // Tracking
      var properties = useragentStats(req.headers['user-agent']);
      statsService.userUpdate(user, properties);

      statsService.event("user_login", _.extend({
        userId: user.id,
        method: (login.indexOf('@') == -1 ? 'username' : 'email'),
        email: user.email
      }, properties));



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
          passwordField: 'password',
          passReqToCallback: true
        },
        loginAndPasswordUserStrategy
    ));

    passport.use(new ConfirmStrategy({ name: "confirm" }, function(confirmationCode, req, done) {
      var self = this;

      winston.verbose("Confirming user with code", { confirmationCode: confirmationCode });

      userService.findByConfirmationCode(confirmationCode, function(err, user) {
        if(err) return done(err);
        if(!user) {
          return done(null, false);
        }

        // if the user is unconfirmed, then confirm them
        // if the user has been confirmed, but hasn't populated their profile, we want to go down the same path
        if (user.status == 'UNCONFIRMED' || user.status == 'PROFILE_NOT_COMPLETED' || user.newEmail) {
          statsService.event('confirmation_completed', { userId: user.id, email: user.email });
          return done(null, user);
        } else {
          // confirmation fails if the user is already confirmed, except when the user is busy confirming their new email address
          statsService.event('confirmation_reused', { userId: user.id });

          winston.verbose("Confirmation already used", { confirmationCode: confirmationCode });

          loginUtils.whereToNext(user, function(err, url) {
            if(err || !url) return self.redirect(nconf.get('web:homeurl'));

            return self.redirect(url);
          });

        }

      });
    })
  );

  passport.use(new ConfirmStrategy({ name: "passwordreset" }, function(confirmationCode, req, done) {
      userService.findAndUsePasswordResetCode(confirmationCode, function(err, user) {
        if(err) return done(err);
        if(!user) {
          //statsService.event('password_reset_invalid', { confirmationCode: confirmationCode });
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
    passport.use(new BasicStrategy({passReqToCallback: true}, loginAndPasswordUserStrategy));

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

    passport.use(new GoogleStrategy({
        clientID:     nconf.get('googleoauth2:client_id'),
        clientSecret: nconf.get('googleoauth2:client_secret'),
        callbackURL:  nconf.get('web:basepath') + '/oauth2callback',
        passReqToCallback: true
      },

      function(req, accessToken, refreshToken, profile, done) {

        if (req.user) {
          // Save the access token in the request
          req.googleAccessToken = accessToken;

          if (!refreshToken) {
            winston.info('passport: Refresh token not available');
            return done(null, req.user);
          }

          req.user.googleRefreshToken = refreshToken;
          req.user.save(function(err) {
            winston.info('passport: User updated with token');
            if(err) done(err);
            return done(null, req.user);
          });

        } else {
          return userService.findByEmail(profile._json.email)
            .then(function(user) {
              if(user) {

                // Tracking
                var properties = useragentStats(req.headers['user-agent']);
                statsService.userUpdate(user, properties);

                statsService.event("user_login", _.extend({
                  userId: user.id,
                  method: 'google_oauth',
                  email: user.email
                }, properties));

                req.logIn(user, function(err) {
                  if (err) { return done(err); }
                  return done(null, user);
                });

                return;
              }

              // This is in fact a new user
              var googleUser = {
                displayName:        profile._json.name,
                email:              profile._json.email,
                gravatarImageUrl:   profile._json.picture,
                googleRefreshToken: refreshToken,
                status:             'PROFILE_NOT_COMPLETED',
                source:             'landing_google'
              };

              winston.verbose('About to create Google user ', googleUser);

              userService.findOrCreateUserForEmail(googleUser, function(err, user) {
                if (err) return done(err);

                winston.verbose('Created Google user ', user.toObject());

                req.logIn(user, function(err) {
                  if (err) { return done(err); }
                  return done(null, user);
                });
              });
            });

        }
      }
    ));

  }

};
