/*jshint globalstrict:true, trailing:false unused:true node:true*/
/*global console:false, require: true, module: true */
"use strict";

var mailerService = require("./mailer-service");
var nconf = require('../utils/config');
var emailDomain = nconf.get("email:domain");
var emailDomainWithAt = "@" + emailDomain;

module.exports = {
  sendConfirmationForExistingUser: function (user, troupe) {
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
  },

  sendPasswordResetForUser: function (user) {
    var resetLink = nconf.get("web:basepath") + "/reset/" + user.passwordResetCode;

    mailerService.sendEmail({
      templateFile: "resetemail",
      to: user.email,
      from: 'admin-robot' + emailDomainWithAt,
      subject: "You requested a password reset",
      data: {
        resetLink: resetLink
      }
    });
  },

  sendConfirmationforNewUserRequest: function(user, troupe) {
    var confirmLink = nconf.get("web:basepath") + "/confirm/" + user.confirmationCode;
    mailerService.sendEmail({
      templateFile: "signupemailfromrequest",
      to: user.email,
      from: 'signup-robot' + emailDomainWithAt,
      subject: "Welcome to Troupe",
      data: {
        troupeName: troupe.name,
        confirmLink: confirmLink
      }
    });
  },

  sendConfirmationForNewUser: function (user, troupe) {
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
  },

  sendInvite: function(troupe, displayName, email, code, senderDisplayName) {
    var acceptLink = nconf.get("web:basepath") + "/" + troupe.uri + "/accept/" + code;

    mailerService.sendEmail({
      templateFile: "inviteemail",
      from: 'signup-robot' + emailDomainWithAt,
      to: email,
      subject: "You been invited to join the " + troupe.name + " troupe",
      data: {
        displayName: displayName,
        troupeName: troupe.name,
        acceptLink: acceptLink,
        senderDisplayName: senderDisplayName
      }
    });
  }
};