/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var emailNotificationService  = require("./email-notification-service");
var troupeService             = require("./troupe-service");
var inviteService             = require("./invite-service");
var userService               = require("./user-service");
var uriService                = require("./uri-service");
var winston                   = require('winston');
var assert                    = require('assert');
var Q                         = require('q');
var userService               = require("./user-service");
var persistence               = require("./persistence-service");

var signupService = module.exports = {
  /**
   * A new signup from the landing page
   * @return the promise of the newly signed up user
   */
  newSignupFromLandingPage: function(options, callback) {
    if(!options.email) return callback('Email address is required');

    options.email = options.email.trim().toLowerCase();
    if(!options.source) options.source = 'landing';

    winston.info("Signup from landing page ", options);

    // We shouldn't have duplicate users in the system, so we should:
    //     * Check if the user exists
    //     * If the user exists, have they previously confirmed their email address
    //     * If the user exists AND has a confirmed email address...
    //     * If the user exists but hasn't previously confirmed their email...
    return userService.findByEmail(options.email)
      .then(function(user) {
        /* If the user exists... */
        if(user) {
          if(!user.isConfirmed() || !user.hasPassword()) {
            emailNotificationService.sendConfirmationForNewUser(user);
          }

          return user;
        }

        winston.info("New user", options);

        return userService.findOrCreateUserForEmail(options)
          .then(function(user) {
            emailNotificationService.sendConfirmationForNewUser(user);
            return user;
          });

      })
    .nodeify(callback);
  },

  /**
   * A new signup from the landing page
   * @return the promise of the newly signed up user
   */
  gitterPromotionGithubSignup: function(options) {
    return Q.fcall(function() {
      var emails = options.emails;

      assert(Array.isArray(emails), 'Emails must be an array');

      emails = emails
                .filter(function(f) { return !!f; })
                .map(function(email) {
                  return email.toLowerCase();
                });

      assert(emails && emails.length, 'At least one email address is expected');

      return Q.all(emails.map(function(email) {
          return userService.findByEmail(email);
        }))
        .then(function(existingUsers) {
          existingUsers = existingUsers.filter(function(f) { return !!f; });
          if(existingUsers.length) throw new Error('User already exists with email address ' + existingUsers[0]);

          return userService.findOrCreateUserForEmail({
            source: 'gitterpromo',
            displayName: options.displayName,
            usernameSuggestion: options.username,
            email: emails.shift()
          });
        });

    });
  },

  /**
   * Resend the confirmation email and returns the related user
   * @return the promise of a user
   */
  resendConfirmationForUser: function(email, callback) {
    return userService.findByEmail(email)
      .then(function(user) {
        if(!user) {
          signupService.resendSecondaryConfirmation(email, callback);
          return;
        }

        if (user.status !== 'UNCONFIRMED') {
          winston.verbose('The user is not unconfirmed so cannot resend confirmation');
          return callback(404);
        }

        winston.verbose('Resending confirmation email to new user', { email: user.email });

        emailNotificationService.sendConfirmationForNewUser(user);
        callback(null, user);
      });
  },

  resendConfirmation: function(options, callback) {
    // This option occurs if the user has possibly lost their session
    // and is trying to get the confirmation sent at a later stage
    var email = options.email;

    signupService.resendConfirmationForUser(email, callback);
   },

  resendSecondaryConfirmation: function(email, callback) {
    winston.verbose('resendSecondaryConfirmation');
    return userService.findByUnconfirmedEmail(email)
      .then(function(user) {
        if(!user) {
          winston.verbose('No user with that unconfirmed email address was found.');
          throw 404;
        }

        var unconfirmed = user.unconfirmedEmails.filter(function(unconfirmedEmail) {
          return unconfirmedEmail.email === email;
        })[0];

        winston.verbose('Resending confirmation email to new user', { email: email });

        emailNotificationService.sendConfirmationForSecondaryEmail({
          email: email,
          confirmationCode: unconfirmed.confirmationCode
        });

        return user;
      })
      .nodeify(callback);

  },

  /**
   * Given a user, should that user go through the signup process?
   * The rules are as follows:
   * 2. If the user belongs to one or more troupes, then no
   * 3. If the user has requested access to a troupe then no
   * 4. If the user has
   *    a) Been invited to a troupe
   *    b) Been invites to connect with another user
   *    c) Signed up with a connection request (One-to-one invite on signup) ****
   * Otherwise, they should go through the startup process
   * @return {promise} promise of a boolean indicating whether they should go through the start process
   */
  shouldUserPerformStartProcess: function(user) {
    assert(user, 'User required');
    var userId = user.id;

    return Q.all([
      troupeService.findAllTroupesIdsForUser(userId),           /* 2. */
      persistence.Request.countQ({ userId: userId }),            /* 3. */
      persistence.RequestUnconfirmed.countQ({ userId: userId }), /* 3. */
      persistence.Invite.countQ({ $or: [{ userId: userId }       /* 4a,b. */ ,
                                      { fromUserId: userId }    /* 4c. */ ] }),
      persistence.InviteUnconfirmed.countQ({ $or: [{ userId: userId } /* 4a,b. */,
                                                  { fromUserId: userId } /* 4c. */] }),
    ]).spread(function(troupes, requestCount, unconfirmedRequestCount, inviteCount, unconfirmedInviteCount) {
      return !(troupes.length || requestCount || unconfirmedRequestCount || inviteCount || unconfirmedInviteCount);
    });
  },

  /**
   * Signup with an access request for a uri
   *
   * The uri could either be a one-to-one troupe, in which case we'll create a signup with connection invite
   * or the uri could be a troupe in which case it'll be a signup with request. In either case, the unconfirmed
   * users invites and requests will only be processed once the user is confirmed
   * @return promise of nothing
   */
  signupWithAccessRequestToUri: function(uri, email, displayName, stats) {
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
              emailNotificationService.sendConfirmationForNewUser(fromUser);

              // Proceed to the next step with this user
              return fromUser;
            }

            // Otherwise the user doesn't exist: create them first
            return userService.findOrCreateUserForEmail({
                email: email,
                displayName: displayName,
                stats: stats,
                source: toTroupe ? 'signup_with_request' : 'signup_with_connect'
              })
              .then(function(newUser) {
                emailNotificationService.sendConfirmationForNewUser(newUser);

                // Proceed to the next step with this user
                return newUser;
              });
          })
          .then(function(user) {
            var step =  toTroupe ? troupeService.addRequest(toTroupe, user)
                                 : inviteService.inviteUserByUserId(null, user, toUser.id);

            return step.then(function() {return user; });
          });
        });

  }

};
