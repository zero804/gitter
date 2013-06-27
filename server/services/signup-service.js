/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var persistence = require("./persistence-service"),
    emailNotificationService = require("./email-notification-service"),
    troupeService = require("./troupe-service"),
    userService = require("./user-service"),
    winston = require('winston'),
    assert = require('assert'),
    Fiber = require('../utils/fiber');

function newTroupe(options, callback) {
  var user = options.user;
  var invites = options.invites;
  var troupeName = options.troupeName;
  var users = options.users;

  var troupe = new persistence.Troupe();
  troupe.name = troupeName;
  troupe.uri = troupeService.createUniqueUri();

  // add the user creating the troupe
  troupe.addUserById(user.id);

  // add other users
  if (users) {
    users.forEach(function(user) {
      troupe.addUserById(user);
    });
  }

  var f = new Fiber();

  troupe.save(f.waitor());

  // invite users
  if (invites) {
    invites.forEach(function(invite) {

      troupeService.createInvite(troupe, {
          fromUser: user,
          email: invite.email,
          displayName: invite.displayName,
          userId: invite.userId
        }, f.waitor());

    });
  }

  f.all().then(function() {
    callback(null, troupe);
  }, callback);
}

function newTroupeForExistingUser(options, user, callback) {
  winston.info("New troupe for existing user", options);

  options.user = user;
  newTroupe(options, function(err, troupe) {
    emailNotificationService.sendNewTroupeForExistingUser(user, troupe);
    callback(err, troupe.id);
  });

}

function newUser(options, callback) {
  winston.info("New user", options);

  return userService.newUser({ displayName: options.displayName, email: options.email })
      .then(function(user) {
        emailNotificationService.sendConfirmationForNewUser(user);
        return user;
      }).nodeify(callback);
}

function sendNotification(user, troupe) {
  if (user.status === 'UNCONFIRMED') {
    winston.verbose('Resending confirmation email to new user', { email: user.email });
    emailNotificationService.sendConfirmationForNewUser(user);
  } else {
    winston.verbose('Resending confirmation email to existing user', { email: user.email });
    emailNotificationService.sendNewTroupeForExistingUser(user, troupe);
  }
  return;
}


var signupService = module.exports = {
  newSignupFromLandingPage: function(options, callback) {
    if(!options.email) return callback('Email address is required');

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
        // do we send the confirm email again?
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

  confirmSignup: function(user, callback) {
    if(!user) return callback(new Error("No user found"));

    winston.verbose("Confirming user", { id: user.id, status: user.status });

    if (user.status === 'UNCONFIRMED') {
      user.status = 'PROFILE_NOT_COMPLETED';
    }

    return user.saveQ()
        .then(function() {
          return troupeService.updateInvitesForEmailToUserId(user.email, user.id)
            .then(function() {
              return troupeService.updateUnconfirmedInvitesForUserId(user.id);
            })
            .then(function() {
              return user;
            });
        })
        .nodeify(callback);

  },

  // Resend the confirmation email and returns the ID of the troupe related to the signed
  resendConfirmationForTroupe: function(troupeId, callback) {
    troupeService.findById(troupeId, function(err, troupe) {
      if(err) return callback(err);

      var troupeUsers = troupe.getUserIds();
      if(troupeUsers.length != 1) {
        winston.error("A confirmation resent cannot be performed as the troupe has multiple users");
        return callback("Invalid state");
      }

      userService.findById(troupeUsers[0], function(err, user) {
        if(err || !user) return callback(err, null);

        sendNotification(user, troupe);

        return callback(null, troupe.id);
      });
    });
  },

  // Resend the confirmation email and returns the related user
  resendConfirmationForUser: function(email, callback) {
    userService.findByEmail(email, function(err, user) {
      if(err || !user) return callback(err, null);

      sendNotification(user);

      callback(null, user);
    });
  },

  resendConfirmation: function(options, callback) {
    // This option occurs if the user has possibly lost their session
    // and is trying to get the confirmation sent at a later stage
    if(options.email) {
      signupService.resendConfirmationForUser(options.email, callback);
    } else {
      signupService.resendConfirmationForTroupe(options.troupeId, callback);
    }
  },

  /*
   * Logic for this bad boy:
   * This will get called when a user has not logged in but is attempted to access a troupe
   * What we do is:
   * - If the email address does not exist, create a new UNCONFIRMED user and add a request for the troupe
   * - IF the email address does exist and the user account is:
   *    - UNCONFIRMED: don't create a new account, but update the name and add a request for the troupe (if one does not already exist)
   *    - COFIRMED: then throw an error saying that the user needs to login
   * callback is function(err, request)
   */
  newSignupWithAccessRequest: function(options, callback) {
    winston.info("New signup with access request ");

    var email = options.email;
    var displayName = options.displayName; // Optional
    var troupe = options.troupe;

    assert(email, 'email parameter is required');
    assert(troupe, 'troupe parameter is required');

    userService.findByEmail(email)
      .then(function(user) {

        if(!user) {
          // Create a new user and add the request. The users confirmation code will not be set until the first time one one of
          // their requests is accepted...does this change now that there is a user homepage?
          return userService.newUser({
              email: email,
              displayName: displayName
            })
            .then(function(newUser) {
              emailNotificationService.sendConfirmationForNewUser(newUser);
              return troupeService.addRequest(troupe, newUser.id);
            });
        }

        // The user exists. Are they confirmed?
        if (user.status === 'UNCONFIRMED') {
          // TODO: Do we want to send the user another email ?

          // try add a request, if there already is a request it will be returned instead of created,
          // if the user is a member of the troupe it will give an error (memberExists: true)
          return troupeService.addRequest(troupe, user.id);
        }

        // tell the user to login
        throw { userExists: true };
      })
      .nodeify(callback);

  },

  /**
   * Unauthenticated user requesting an invite with an authenticated user.
   * @param  {[type]} toUser
   * @param  {[type]} email
   * @param  {[type]} name
   * @return {[type]}
   */
  newUnauthenticatedConnectionInvite: function(toUser, email, name) {
    return userService.findByEmail(email)
        .then(function(fromUser) {

          // This person is already a user
          if(fromUser) {
            return troupeService.findImplicitConnectionBetweenUsers(fromUser.id, toUser.id)
                .then(function(implicitConnection) {
                  // Check if fromUser has an implicit connection to toUser, no need for am invite...
                  if(!implicitConnection) {
                    return troupeService.inviteUserByUserId(null, fromUser.id, toUser.id);
                  }
                })
                .then(function() {
                  throw { userExists: true, hasPassword: !!fromUser.passordHash };
                });
          }

          // The person is not already a user, create an unconfirmed account for them
          newUser({ email: email, displayName: name })
            .then(function(newUser) {

              return troupeService.inviteUserByUserId(null, newUser.id, toUser.id, true /* UNCONFIRMED */);
            });

        });

  }

};