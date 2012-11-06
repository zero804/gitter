/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true, process: false */
"use strict";
var userService = require('../services/user-service');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var ConfirmStrategy = require('../web/confirm-strategy').Strategy;
var winston = require('../utils/winston');
var troupeService = require('../services/troupe-service');

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
        function(email, password, done) {
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
  }
};