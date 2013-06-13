/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var persistence = require("./persistence-service"),
    emailNotificationService = require("./email-notification-service"),
    troupeService = require("./troupe-service"),
    userService = require("./user-service"),
    winston = require('winston'),
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
      troupeService.inviteUserToTroupe(troupe, user.displayName, invite, f.waitor());
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

  userService.newUser({ email: options.email }, function (err, user) {
    if(err) {
      callback(err); return;
    }

    options.user = user;
    emailNotificationService.sendConfirmationForNewUser(user);
    callback(err, user);
  });
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

        troupeService.findBestTroupeForUser(user, function(err, troupe) {
          if(err) return callback(new Error("Error finding troupes for user"));

          return callback(err, user, troupe);
        });

      });
    });

  },

  confirmSignup: function(user, callback) {
    if(!user) return callback(new Error("No user found"));
    winston.verbose("Confirming user", { id: user.id, status: user.status });

    if (user.status === 'UNCONFIRMED') {
      user.status = 'PROFILE_NOT_COMPLETED';
    }

    user.save(function(err) {
      if(err) return callback(err);

      winston.verbose("User saved, finding troupe to redirect to", { id: user.id, status: user.status });

      troupeService.findBestTroupeForUser(user, function(err, troupe) {
        if(err) return callback(new Error("Error finding troupes for user"));

        return callback(err, user, troupe);
      });
    });

  },

  // Resend the confirmation email and returns the ID of the troupe related to the signed
  resendConfirmation: function(options, callback) {
    var email = options.email;

    function sendNotification(user, troupe) {
      if (user.status === 'UNCONFIRMED') {
        winston.verbose('Resending confirmation email to new user', { email: user.email });
        emailNotificationService.sendConfirmationForNewUser(user, troupe, function() {});
      } else {
        winston.verbose('Resending confirmation email to existing user', { email: user.email });
        emailNotificationService.sendNewTroupeForExistingUser(user, troupe);
      }
      return;
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
            sendNotification(user, troupe);

            return callback(null, troupe.id);
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

          sendNotification(user, troupe);

          return callback(null, troupe.id);
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
        if (user.status === 'UNCONFIRMED') {
          // try add a request, if there already is a request it will be returned instead of created,
          // if the user is a member of the troupe it will give an error (memberExists: true)
          troupeService.addRequest(troupeId, user.id, function(err, request) {
            if(err) return callback(err);
            callback(null, request);
          });
        }
        else {
          // tell the user to login
          callback({ userExists: true });
        }
      }
    });
  },

  newUnauthenticatedAccessRequest: function(troupeUri, email, name, callback) {
    troupeService.findByUri(troupeUri, function(err, troupe) {
      if(err) { winston.error("findByUri failed", { exception: err } ); return callback(500); }
      if(!troupe) { winston.error("No troupe with uri", { uri: troupeUri }); return callback(404); }

      var signupParams = {
        troupeId: troupe.id,
        name: name,
        email: email
      };

      module.exports.newSignupWithAccessRequest(signupParams, function(err) {
        if(err) {
          winston.error("newSignupWithAccessRequest failed", { exception: err } );

          if(err.userExists) {
            return callback({ userExists: true });
          }

          if (err.memberExists) {
            return callback({ memberExists: true });
          }

          return callback(500);
        }

        callback();
      });

    });
  }


};