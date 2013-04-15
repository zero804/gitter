/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var mailerService = require("./mailer-service");
var nconf = require('../utils/config');
var assert = require('assert');
var emailDomain = nconf.get("email:domain");
var emailDomainWithAt = "@" + emailDomain;

module.exports = {
  sendNewTroupeForExistingUser: function (user, troupe) {
    var troupeLink = nconf.get("web:basepath") + "/" + troupe.uri + "#|shareTroupe";

    mailerService.sendEmail({
      templateFile: "newtroupe_email",
      to: user.email,
      from: 'signup-robot' + emailDomainWithAt,
      subject: "You created a new Troupe",
      data: {
        troupeName: troupe.name,
        troupeLink: troupeLink,
        baseServerPath: nconf.get("web:basepath")
      }
    });
  },

  sendRequestAcceptanceToUser: function(user, troupe) {
    assert(user.confirmationCode, 'User does not have a confirmation code');

    var troupeLink = nconf.get("web:basepath") + "/" + troupe.uri + "/confirm/" + user.confirmationCode;

    mailerService.sendEmail({
      templateFile: "signupemailfromrequest",
      to: user.email,
      from: 'signup-robot' + emailDomainWithAt,
      subject: "You've been accepted into a troupe",
      data: {
        troupeName: troupe.name,
        // note: this is not really a confirm link, just a link to the troupe
        confirmLink: troupeLink,
        baseServerPath: nconf.get("web:basepath")
      }
    });
  },

  sendPasswordResetForUser: function (user) {
    assert(user.passwordResetCode, 'User does not have a password reset code');

    var resetLink = nconf.get("web:basepath") + "/reset/" + user.passwordResetCode;

    mailerService.sendEmail({
      templateFile: "resetemail",
      to: user.email,
      from: 'admin-robot' + emailDomainWithAt,
      subject: "You requested a password reset",
      data: {
        resetLink: resetLink,
        baseServerPath: nconf.get("web:basepath")
      }
    });
  },

  sendConfirmationForNewUserRequest: function(user, troupe) {
    assert(user.confirmationCode, 'User does not have a confirmation code');

    var confirmLink = nconf.get("web:basepath") + "/" + troupe.uri + "/confirm/" + user.confirmationCode + '?fromRequest=1';
    mailerService.sendEmail({
      templateFile: "signupemailfromrequest",
      to: user.email,
      from: 'signup-robot' + emailDomainWithAt,
      subject: "Welcome to Troupe",
      data: {
        troupeName: troupe.name,
        confirmLink: confirmLink,
        baseServerPath: nconf.get("web:basepath")
      }
    });
  },

  sendConfirmationForNewUser: function (user, troupe) {
    assert(user.confirmationCode, 'User does not have a confirmation code');

    var confirmLink = nconf.get("web:basepath") + "/" + troupe.uri + "/confirm/" + user.confirmationCode;
    mailerService.sendEmail({
      templateFile: "signupemail",
      to: user.email,
      from: 'signup-robot' + emailDomainWithAt,
      subject: "Welcome to Troupe",
      data: {
        troupeName: troupe.name,
        confirmLink: confirmLink,
        baseServerPath: nconf.get("web:basepath")
      }
    });
  },

  sendConfirmationForEmailChange: function (user) {
    assert(user.confirmationCode, 'User does not have a confirmation code');

    var confirmLink = nconf.get("web:basepath") + "/confirm/" + user.confirmationCode;
    var to = user.newEmail;

    mailerService.sendEmail({
      templateFile: "change-email-address",
      to: to,
      from: 'signup-robot' + emailDomainWithAt,
      subject: "Confirm new email address",
      data: {
        confirmLink: confirmLink,
        originalEmail: user.email,
        newEmail: user.newEmail,
        baseServerPath: nconf.get("web:basepath")
      }
    });
  },

  sendNoticeOfEmailChange: function (user, origEmail, newEmail) {
    mailerService.sendEmail({
      templateFile: "change-email-address-complete",
      to: [origEmail, newEmail],
      from: 'signup-robot' + emailDomainWithAt,
      subject: "Your email address has been successfully changed",
      data: {
        baseServerPath: nconf.get("web:basepath"),
        originalEmail: origEmail,
        newEmail: newEmail
      }
    });
  },

  sendInvite: function(troupe, displayName, email, code, senderDisplayName) {
    var acceptLink = nconf.get("web:basepath") + "/" + troupe.uri + "/accept/" + code;

    mailerService.sendEmail({
      templateFile: "inviteemail",
      from: senderDisplayName + '<signup-robot' + emailDomainWithAt + '>',
      to: email,
      subject: "You been invited to join the " + troupe.name + " troupe",
      data: {
        displayName: displayName,
        troupeName: troupe.name,
        acceptLink: acceptLink,
        senderDisplayName: senderDisplayName,
        baseServerPath: nconf.get("web:basepath")
      }
    });
  }
};