/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true */
"use strict";

var persistence = require("./persistence-service"),
    mailerService = require("./mailer-service"),
    troupeService = require("./troupe-service"),
    userService = require("./user-service"),
    uuid = require('node-uuid'),
    sechash = require('sechash'),
    nconf = require("../utils/config").configure();


var emailDomain = nconf.get("email:domain");
var emailDomainWithAt = "@" + emailDomain;

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
  var uri = createUniqueUri();

  var troupe = new persistence.Troupe();
  troupe.name = options.troupeName;
  troupe.uri = uri;
  troupe.users = [user.id];

  troupe.save(function(err) {
    if(err) return callback(err);

    sendConfirmationForExistingUser(user, troupe);
    callback(null, troupe.id);
  });
}

function newTroupeForNewUser(options, callback) {
  var confirmationCode = uuid.v4();
  var user = new persistence.User();
  user.email = options.email;
  user.confirmationCode = confirmationCode;

  var uri = createUniqueUri();

  user.save(function (err) {
    if(err) {
      callback(err);
      return;
    }

    var troupe = new persistence.Troupe();
    troupe.name = options.troupeName;
    troupe.uri = uri;
    troupe.users = [user.id];

    troupe.save(function(err) {
      if(err) return  callback(err);

      sendConfirmationForNewUser(user, troupe);

      callback(null, troupe.id);
    });
  });
}

function sendConfirmationForExistingUser(user, troupe) {
  var troupeLink = nconf.get("web:basepath") + "/" + troupe.uri;

  mailerService.sendEmail({
    templateFile: "signupemail_existing",
    to: user.email,
    from: 'signup-robot' + emailDomainWithAt,
    subject: "You created a new Troupe",
    data: {
      troupeName: troupe.name,
      troupeLink: troupeLink
    }
  });
}

function sendConfirmationForNewUser(user, troupe) {
  var confirmLink = nconf.get("web:basepath") + "/confirm/" + user.confirmationCode;
  mailerService.sendEmail({
    templateFile: "signupemail",
    to: user.email,
    from: 'signup-robot' + emailDomainWithAt,
    subject: "Welcome to Troupe",
    data: {
      troupeName: troupe.name,
      confirmLink: confirmLink
    }
  });
}

module.exports = {
  newSignup: function(options, callback) {

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

  confirm: function(user, callbackFunction) {
    if(!user) return callbackFunction(new Error("No user found"));

    user.confirmationCode = null;
    user.status = 'PROFILE_NOT_COMPLETED';

    user.save(function(err) {
      troupeService.findAllTroupesForUser(user.id, function(err, troupes) {
        if(err) return callbackFunction(new Error("Error finding troupes for user"));
        if(troupes.length < 1) return callbackFunction(new Error("Could not find troupe for user"));

        callbackFunction(err, user, troupes[0]);
      });
    });
  },

  resendConfirmation: function(options, callback) {
    troupeService.findById(options.troupeId, function(err, troupe) {
      if(err) return callback(err);

      if(troupe.users.length != 1) {
        console.log("A confirmation resent cannot be performed as the troupe has multiple users");
        return callback("Invalid state");
      }

      console.log("ID = " + troupe.users[0]);

      userService.findById(troupe.users[0], function(err, user) {
        console.dir(err);
        if(err || !user) return callback("Invalid state");
        if(user.status != 'UNCONFIRMED') {
          sendConfirmationForExistingUser(user, troupe);
        } else {
          sendConfirmationForNewUser(user, troupe);
        }

        callback(null, troupe.id);
      });

    });
  },

  updateProfile: function(options, callback) {
    var user = options.user;

    if(user.passwordHash) return callback("User already has a password set");

    sechash.strongHash('sha512', options.password, function(err, hash3) {
      if(err) return callback(err);

      user.passwordHash = hash3;
      user.displayName = options.displayName;
      user.save(function(err) {
        callback(err);
      });
    });
  }
};