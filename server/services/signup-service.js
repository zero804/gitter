/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var emailNotificationService = require("./email-notification-service"),
    troupeService = require("./troupe-service"),
    userService = require("./user-service"),
    uriService = require("./uri-service"),
    winston = require('winston'),
    assert = require('assert'),
    appEvents = require('../app-events'),
    Q = require('q');

function newUser(options, callback) {
  winston.info("New user", options);

  return userService.newUser({ displayName: options.displayName, email: options.email })
      .then(function(user) {
        emailNotificationService.sendConfirmationForNewUser(user);
        return user;
      }).nodeify(callback);
}

var signupService = module.exports = {
  newSignupFromLandingPage: function(options, callback) {
    if(!options.email) return callback('Email address is required');

    options.email = options.email.trim().toLowerCase();

    winston.info("New signup ", options);

    // We shouldn't have duplicate users in the system, so we should:
    //     * Check if the user exists
    //     * If the user exists, have they previously confirmed their email address
    //     * If the user exists AND has a confirmed email address...
    //     * If the user exists but hasn't previously confirmed their email...

    userService.findByEmail(options.email, function(err, user) {
      if(err) {
        callback(err, null);
        return;
      }

      if(user) {
        if(!user.isConfirmed() || !user.hasPassword()) {
          emailNotificationService.sendConfirmationForNewUser(user);
        }

        callback(err, user);
      } else {
        newUser(options, callback);
      }

    });
  },

  confirmEmailChange: function(user, callback) {
    if(!user) return callback(new Error("No user found"));
    if(!user.newEmail) return callback(new Error("User does not have a newEmail property. Aborting. "));

    if (user.status === 'UNCONFIRMED') {
      // setting the status marks the user as confirmed
      user.status = 'PROFILE_NOT_COMPLETED';
    }

    var origEmail = user.email;
    var newEmail = user.newEmail;

    // ensure that the email address being changed to is still available.
    userService.findByEmail(newEmail, function(e, u) {
      if (e || u) return callback("That email address is already registered");

      user.oldEmail = user.email;
      user.email = user.newEmail;
      user.newEmail = null;

      // send an email to confirm that the confirmation of the email address change...was confirmed.
      emailNotificationService.sendNoticeOfEmailChange(user, origEmail, newEmail);

      user.save(function(err) {
        if(err) return callback(err);

        // Signal that an email address has been confirmed
        appEvents.emailConfirmed(newEmail, user.id);

        winston.verbose("User email address change complete, finding troupe to redirect to", { id: user.id, status: user.status });

        troupeService.updateInvitesForEmailToUserId(newEmail, user.id, function(err) {
          if(err) return callback(err);

          troupeService.findBestTroupeForUser(user, function(err, troupe) {
            if(err) return callback(new Error("Error finding troupes for user"));

            return callback(err, user, troupe);
          });

        });

      });
    });

  },

  confirm: function(user, callback) {
    if (user.newEmail) {
      return signupService.confirmEmailChange(user, callback);
    } else {
      return signupService.confirmSignup(user, callback);
    }
  },

  /**
   * Mark a user as confirmed
   * @return promise of a troupe
   */
  confirmSignup: function(user, callback) {
    if(!user) return Q.reject(404).nodeify(callback);

    winston.verbose("Confirming user", { id: user.id, status: user.status });

    if (user.status === 'UNCONFIRMED') {
      user.status = 'PROFILE_NOT_COMPLETED';
    }

    return user.saveQ()
        .then(function() {
          // Signal that an email address has been confirmed
          appEvents.emailConfirmed(user.email, user.id);

          return troupeService.updateInvitesForEmailToUserId(user.email, user.id)
            .then(function() {
              return Q.all([
                troupeService.updateUnconfirmedInvitesForUserId(user.id),
                troupeService.updateUnconfirmedRequestsForUserId(user.id)
                ]);
            })
            .then(function() {
              return user;
            });
        })
        .nodeify(callback);

  },

  /**
   * Resend the confirmation email and returns the related user
   * @return the promise of a user
   */
  resendConfirmationForUser: function(email, callback) {
    return userService.findByEmail(email)
      .then(function(user) {
        if(!user) throw 404;
        if (user.status !== 'UNCONFIRMED') throw 404;

        winston.verbose('Resending confirmation email to new user', { email: user.email });
        emailNotificationService.sendConfirmationForNewUser(user);
        return user;
      })
      .nodeify(callback);
  },

  resendConfirmation: function(options, callback) {
    // This option occurs if the user has possibly lost their session
    // and is trying to get the confirmation sent at a later stage
    signupService.resendConfirmationForUser(options.email, callback);
  },

  /**
   * Signup with an access request for a uri
   *
   * The uri could either be a one-to-one troupe, in which case we'll create a signup with connection invite
   * or the uri could be a troupe in which case it'll be a signup with request. In either case, the unconfirmed
   * users invites and requests will only be processed once the user is confirmed
   * @return promise of nothing
   */
  signupWithAccessRequestToUri: function(uri, email, displayName) {
    assert(uri, 'uri parameter required');
    assert(email, 'email parameter required');

    return uriService.findUri(uri)
      .then(function(result) {
        if(!result) { winston.error("No troupe with uri: " + uri); throw 404; }

        var toTroupe = result.troupe;
        var toUser = result.user;

        return userService.findByEmail(email)
          .then(function(fromUser) {

            if(fromUser) {
              // If we found the user, they already exist, so send them a message letting them know
              if(fromUser.isConfirmed()) throw { userExists: true };

              // If the user is attempting to access a troupe, but isn't confirmed,
              // resend the confirmation
              signupService.resendConfirmationForUser(fromUser.email);

              // Proceed to the next step with this user
              return fromUser;
            }

            // Otherwise the user doesn't exist: create them first
            return userService.newUser({
                email: email,
                displayName: displayName
              })
              .then(function(newUser) {
                emailNotificationService.sendConfirmationForNewUser(newUser);

                // Proceed to the next step with this user
                return newUser;
              });
          })
          .then(function(user) {
            var step =  toTroupe ? troupeService.addRequest(toTroupe, user)
                                 : troupeService.inviteUserByUserId(null, user, toUser.id);

            return step.then(function() {return user; });
          });
        });

  }

};