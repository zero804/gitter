/*jshint globalstrict:true, trailing:false unused:true node:true*/
"use strict";

var persistence = require("./persistence-service"),
    emailNotificationService = require("./email-notification-service"),
    troupeService = require("./troupe-service"),
    userService = require("./user-service"),
    uuid = require('node-uuid'),
    winston = require('winston');


function createUniqueUri() {
  var chars = "0123456789abcdefghiklmnopqrstuvwxyz";

  var uri = "";
  for(var i = 0; i < 6; i++) {
    var rnum = Math.floor(Math.random() * chars.length);
    uri += chars.substring(rnum, rnum + 1);
  }

  return uri;
}

function newTroupeForExistingUser(options, user, callback) {
  winston.info("New troupe for existing user", options);

  var uri = createUniqueUri();

  var troupe = new persistence.Troupe();
  troupe.name = options.troupeName;
  troupe.uri = uri;
  troupe.addUserById(user.id);

  troupe.save(function(err) {
    if(err) return callback(err);
    // No need to send an email for existing users
    emailNotificationService.sendConfirmationForExistingUser(user, troupe);
    callback(null, troupe.id);
  });
}

function newTroupeForNewUser(options, callback) {
  winston.info("New troupe for new user", options);
  var confirmationCode = uuid.v4();

  userService.newUser({ email: options.email, confirmationCode: confirmationCode }, function (err, user) {
    if(err) {
      callback(err);
      return;
    }

    var uri = createUniqueUri();

    var troupe = new persistence.Troupe();
    troupe.name = options.troupeName;
    troupe.uri = uri;
    troupe.addUserById(user.id);

    troupe.save(function(err) {
      if(err) return  callback(err);

      emailNotificationService.sendConfirmationForNewUser(user, troupe);

      callback(null, troupe.id);
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
    winston.debug("Confirming user", { id: user.id, status: user.status });

    user.status = 'PROFILE_NOT_COMPLETED';

    user.save(function(err) {
      if(err) return callback(err);

      winston.debug("User saved, finding troupe to redirect to", { id: user.id, status: user.status });
      troupeService.findAllTroupesForUser(user.id, function(err, troupes) {
        if(err) return callback(new Error("Error finding troupes for user"));
        if(troupes.length < 1) return callback(new Error("Could not find troupe for user"));

        callback(err, user, troupes[0]);
      });
    });
  },

  resendConfirmation: function(options, callback) {
    winston.info("Resending confirmation ", options);
    var email = options.email;

    // This option occurs if the user has possibly lost their session
    // and is trying to get the confirmation sent at a later stage
    if(options.email) {
        userService.findByEmail(email, function(err, user) {
          if(err || !user) return callback(err, null);

          if(user.status != 'UNCONFIRMED') {
            return callback("User is not unconfirmed...", null);
          }

          troupeService.findAllTroupesForUser(user.id, function(err, troupes) {
            if(err || !troupes.length) return callback(err, null);

            // This list should always contain a single value for a new user
            var troupe = troupes[0];
            emailNotificationService.sendConfirmationForNewUser(user, troupe);
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
          if(err || !user) return callback(err, user);
          if(user.status != 'UNCONFIRMED') {
            emailNotificationService.sendConfirmationForExistingUser(user, troupe);
          } else {
            emailNotificationService.sendConfirmationForNewUser(user, troupe);
          }

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
   * callback is function(err)
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
        user = new persistence.User();
        user.status = 'UNCONFIRMED';
        user.email = email;
        user.displayName = name;

        user.save(function (err) {
          if(err) return callback(err);

          troupeService.addRequest(troupeId, user.id, function(err, request) {
            if(err) return callback(err);
            callback(null);
          });
        });

      } else {
        troupeService.addRequest(troupeId, user.id, function(err, request) {
          if(err) return callback(err);
          callback(null);
        });
      }
    });
  }
};