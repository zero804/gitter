/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var persistence = require("./persistence-service"),
    emailNotificationService = require("./email-notification-service"),
    troupeService = require("./troupe-service"),
    userService = require("./user-service"),
    uuid = require('node-uuid'),
    winston = require('winston');


function newTroupe(options, callback) {
  var user = options.user;

  var troupe = new persistence.Troupe();
  troupe.name = options.troupeName;
  troupe.uri = troupeService.createUniqueUri();

  // add the user creating the troupe
  troupe.addUserById(user.id);

  // add other users
  if (options.users) {
    for (var a = 0; a < options.users; a++) {
      troupe.addUserById(options.users[a]);
    }
  }

  // invite users
  if (options.invites) {
    for (var b = 0; b < options.invites; b++)
      troupeService.addInvite(troupe, user.displayName, options.invites[b].displayName, options.invites[b].email);
  }

  troupe.save(function(err) {
    // send out email notification
    if (!options.isNewUser) {
      emailNotificationService.sendNewTroupeForExistingUser(user, troupe);
    }
    else {
      emailNotificationService.sendConfirmationForNewUser(user, troupe);
    }

    callback(err, troupe);
  });
}

function newTroupeForExistingUser(options, user, callback) {
  winston.info("New troupe for existing user", options);

  options.user = user;
  newTroupe(options, function(err, troupe) {
    callback(err, troupe.id);
  });

}

function newTroupeForNewUser(options, callback) {
  winston.info("New troupe for new user", options);

  userService.newUser({ email: options.email }, function (err, user) {
    if(err) {
      callback(err); return;
    }

    options.user = user;
    options.isNewUser = true;
    newTroupe(options, function(err, troupe) {
      callback(err, troupe.id);
    });
  });
}


module.exports = {
  newSignup: function(options, callback) {
    winston.info("New signup ", options);


    // We shouldn't have duplicate users in the system, so we should:
    //     * Check if the user exists
    //     * If the user exists, have they previously confirmed their email address
    //     * If the user exists AND has a confirmed email address, create the Troupe and send a New Troupe email rather than a Welcome to Troupe email and redirect them straight to the Troupe not the confirm page.
    //     * If the user exists but hasn't previously confirmed their email - then we need to figure out something... should we resend the same confirmation code that was previously sent out or should we send a new one. Say someone creates 3 Troupes in a row, each one will generate a different confirmation code. It's the email address you are confirming not the Troupe.
    //

    userService.findByEmail(options.email, function(err, user) {
      if(err) {
        callback(err, null);
        return;
      }

      if(user) {
        newTroupeForExistingUser(options, user, callback);
      } else {
        newTroupeForNewUser(options, callback);
      }
    });
  },

  confirm: function(user, callback) {
    if(!user) return callback(new Error("No user found"));
    winston.verbose("Confirming user", { id: user.id, status: user.status });

    if (user.status === 'UNCONFIRMED') {
      // setting the status marks the user as confirmed
      user.status = 'PROFILE_NOT_COMPLETED';
    }

    // if there is a newEmail then this confirmation is the change of the address
    if (user.newEmail) {
      confirmEmailChange();
    } else {
      confirmSignup();
    }

    function confirmSignup() {
      user.save(finish);
    }

    function confirmEmailChange() {
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

        user.save(finish);
      });
    }

    function finish(err) {
      if(err) return callback(err);

      winston.verbose("User saved, finding troupe to redirect to", { id: user.id, status: user.status });
      troupeService.findAllTroupesForUser(user.id, function(err, troupes) {
        var t = null;

        if(err) return callback(new Error("Error finding troupes for user"));

        if(troupes.length < 1) {
          winston.warn("User has no troupes");
          t = null;
          // return callback(new Error("Could not find troupe for user"));
        }
        else {
          t = troupes[0];
        }


        callback(err, user, t);
      });
    }

  },

  // Resend the confirmation email and returns the ID of the troupe related to the signed
  resendConfirmation: function(options, callback) {
    winston.info("Resending confirmation ", options);
    var email = options.email;

    function send(user, troupe) {
      if(user.status != 'UNCONFIRMED') {
        emailNotificationService.sendNewTroupeForExistingUser(user, troupe);
      } else {
        emailNotificationService.sendConfirmationForNewUser(user, troupe);
      }
    }

    // This option occurs if the user has possibly lost their session
    // and is trying to get the confirmation sent at a later stage
    if(options.email) {
        userService.findByEmail(email, function(err, user) {
          if(err || !user) return callback(err, null);

          troupeService.findAllTroupesForUser(user.id, function(err, troupes) {
            if(err || !troupes.length) return callback(err, null);

            // This list should always contain a single value for a new user
            var troupe = troupes[0];
            send(user, troupe);
            callback(null, troupe.id);
          });
        });

    } else {
      troupeService.findById(options.troupeId, function(err, troupe) {
        if(err) return callback(err);

        var troupeUsers = troupe.getUserIds();
        if(troupeUsers.length != 1) {
          winston.error("A confirmation resent cannot be performed as the troupe has multiple users");
          return callback("Invalid state");
        }

        userService.findById(troupeUsers[0], function(err, user) {
          if(err || !user) return callback(err, null);

          send(user, troupe);

          callback(null, troupe.id);
        });

      });
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
    winston.info("New signup with access request ", options);

    var email = options.email;
    var name = options.name;
    var troupeId = options.troupeId;

    userService.findByEmail(email, function(err, user) {
      if(err) return callback(err);

      if(!user) {
        // Create a new user and add the request. The users confirmation code will not be set until the first time one one of
        // their requests is accepted
        var userProperties = {
          status: 'UNCONFIRMED',
          email: email,
          displayName: name
        };

        userService.newUser(userProperties, function(err, user) {
          if(err) return callback(err);

          troupeService.addRequest(troupeId, user.id, function(err, request) {
            if(err) return callback(err);
            callback(null, request);
          });
        });

      } else {
        troupeService.addRequest(troupeId, user.id, function(err, request) {
          if(err) return callback(err);
          callback(null, request);
        });
      }
    });
  },

  acceptInvite: function (code, user, callback) {
    // confirm the user if they are not already.
    if (user.status == 'UNCONFIRMED') {
      user.status = 'PROFILE_NOT_COMPLETED';
      user.save();
    }

    troupeService.findInviteByCode(code, function(err, invite) {
      if(err) return callback(err);
      if(!invite) return callback(new Error("Invite code not found"));

      troupeService.findById(invite.troupeId, function(err, troupe) {
        if(err) return callback(err);
        if(!troupe) return callback(new Error("Cannot find troupe referenced by invite."));

        var originalStatus = invite.status;
        if(originalStatus != 'UNUSED') {
          return callback(null, troupe, originalStatus);
        }

        invite.status = 'USED';
        invite.save();

        troupe.addUserById(user.id);
        troupe.save(function(err) {
          if(err) return callback(err);
          return callback(null, troupe, originalStatus);
        });

      });

    });
  }

};