/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var mailerService = require("./mailer-service");
var nconf = require('../utils/config');
var assert = require('assert');
var url = require('url');
var appEvents = require('../app-events');

module.exports = {
  sendNewTroupeForExistingUser: function (user, troupe) {
    var troupeLink = nconf.get("email:emailBasePath") + "/" + troupe.uri + "#|share";

    mailerService.sendEmail({
      templateFile: "newtroupe_email",
      to: user.email,
      from: 'Troupe <support@troupe.co>',
      subject: "You created a new Troupe",
      data: {
        troupeName: troupe.name,
        troupeLink: troupeLink,
        baseServerPath: nconf.get("email:emailBasePath")
      }
    });
  },

  sendRequestAcceptanceToUser: function(user, troupe) {
    var troupeLink = nconf.get("email:emailBasePath") + "/" + troupe.uri;

    appEvents.userNotification({
      userId: user.id,
      troupeId: troupe.id,
      title: "Request accepted",
      text: "You've been accepted into a Troupe",
      link:  "/" + troupe.uri
    });

    mailerService.sendEmail({
      templateFile: "requestacceptance",
      to: user.email,
      from: 'Troupe <support@troupe.co>',
      subject: "You've been accepted into a Troupe",
      data: {
        troupeName: troupe.name,
        // note: this is not really a confirm link, just a link to the troupe
        confirmLink: troupeLink,
        baseServerPath: nconf.get("email:emailBasePath")
      }
    });
  },

  sendConnectAcceptanceToUser: function(fromUser, toUser, troupeUrl) {
    var troupeLink = url.resolve(nconf.get("email:emailBasePath"), troupeUrl);

    appEvents.userNotification({
      userId: fromUser.id,
      title: "Invite accepted",
      text: "You are now connected to " + toUser.displayName,
      link:  troupeUrl
    });

    mailerService.sendEmail({
      templateFile: "connectacceptance",
      to: fromUser.email,
      from: 'Troupe <support@troupe.co>',
      subject: "Your invite has been accepted",
      data: {
        fromUser: fromUser,
        toUser: toUser,
        troupeLink: troupeLink,
        baseServerPath: nconf.get("email:emailBasePath")
      }
    });
  },

  sendPasswordResetForUser: function (user) {
    assert(user.passwordResetCode, 'User does not have a password reset code');

    var resetLink = nconf.get("email:emailBasePath") + "/reset/" + user.passwordResetCode;

    mailerService.sendEmail({
      templateFile: "resetemail",
      to: user.email,
      from: 'Troupe <support@troupe.co>',
      subject: "You requested a password reset",
      data: {
        resetLink: resetLink,
        baseServerPath: nconf.get("email:emailBasePath")
      }
    });
  },

  sendConfirmationForNewUser: function (user) {
    assert(user.confirmationCode, 'User does not have a confirmation code');

    var confirmLink = nconf.get("email:emailBasePath") + "/confirm/" + user.confirmationCode;
    mailerService.sendEmail({
      templateFile: "signupemail",
      to: user.email,
      from: 'Troupe <support@troupe.co>',
      subject: "Welcome to Troupe, please confirm your email address",
      data: {
        confirmLink: confirmLink,
        baseServerPath: nconf.get("email:emailBasePath")
      }
    });
  },

  sendConfirmationForEmailChange: function (user) {
    assert(user.confirmationCode, 'User does not have a confirmation code');

    var confirmLink = nconf.get("email:emailBasePath") + "/confirm/" + user.confirmationCode;
    var to = user.newEmail;

    mailerService.sendEmail({
      templateFile: "change-email-address",
      to: to,
      from: 'Troupe <support@troupe.co>',
      subject: "Confirm new email address",
      data: {
        confirmLink: confirmLink,
        originalEmail: user.email,
        newEmail: user.newEmail,
        baseServerPath: nconf.get("email:emailBasePath")
      }
    });
  },

  sendConfirmationForSecondaryEmail: function (unconfirmed) {
    assert(unconfirmed.confirmationCode, 'No confirmation code found');

    var confirmLink = nconf.get("email:emailBasePath") + "/confirmSecondary/" + unconfirmed.confirmationCode;
    var to = unconfirmed.email;

    mailerService.sendEmail({
      templateFile: "add-email-address",
      to: to,
      from: 'Troupe <support@troupe.co>',
      subject: "Confirm new email address",
      data: {
        confirmLink: confirmLink,
        // originalEmail: unconfirmed.email,
        newEmail: unconfirmed.email,
        baseServerPath: nconf.get("email:emailBasePath")
      }
    });
  },

  sendNoticeOfEmailChange: function (user, origEmail, newEmail) {
    assert(origEmail, 'origEmail parameter required');
    assert(newEmail, 'newEmail parameter required');

    mailerService.sendEmail({
      templateFile: "change-email-address-complete",
      to: [origEmail, newEmail],
      from: 'Troupe <support@troupe.co>',
      subject: "Your email address has been successfully changed",
      data: {
        baseServerPath: nconf.get("email:emailBasePath"),
        originalEmail: origEmail,
        newEmail: newEmail
      }
    });
  },

  sendInvite: function(troupe, displayName, email, code, senderDisplayName) {
    assert(email, 'email parameter required');
    assert(senderDisplayName, 'senderDisplayName parameter required');

    var acceptLink;
    if(code) {
      acceptLink = nconf.get("email:emailBasePath") + "/" + troupe.uri + "/accept/" + code;
    } else {
      acceptLink = nconf.get("email:emailBasePath") + "/" + troupe.uri;
    }

    mailerService.sendEmail({
      templateFile: "inviteemail",
      from: senderDisplayName + '<support@troupe.co>',
      to: email,
      subject: "You've been invited to join the " + troupe.name + " troupe",
      data: {
        displayName: displayName,
        troupeName: troupe.name,
        acceptLink: acceptLink,
        senderDisplayName: senderDisplayName,
        baseServerPath: nconf.get("email:emailBasePath")
      }
    });
  },


  sendConnectInvite: function(uri, displayName, email, code, senderDisplayName) {
    assert(uri, 'uri parameter required');
    assert(email, 'email parameter required');
    assert(senderDisplayName, 'senderDisplayName parameter required');

    var acceptLink;
    if(code) {
      acceptLink = nconf.get("email:emailBasePath") + uri + "/accept/" + code;
    } else {
      acceptLink = nconf.get("email:emailBasePath") + uri + "/accept/";
    }

    mailerService.sendEmail({
      templateFile: "invite_connect_email",
      from: senderDisplayName + '<support@troupe.co>',
      to: email,
      subject: senderDisplayName + " has invited you to connect on Troupe",
      data: {
        displayName: displayName,
        acceptLink: acceptLink,
        senderDisplayName: senderDisplayName,
        baseServerPath: nconf.get("email:emailBasePath")
      }
    });
  },

  sendContactSignupNotification: function(signupUser, toUser) {
    var signupDisplayName = signupUser.displayName;
    var email = toUser.email;

    mailerService.sendEmail({
      templateFile: "contact_signup_notification",
      from: 'Troupe <support@troupe.co>',
      to: email,
      subject: signupDisplayName + " has joined Troupe",
      data: {
        signupDisplayName: signupDisplayName,
        connectLink: nconf.get("email:emailBasePath") + signupUser.getHomeUrl(),
      }
    });
  },

  sendUnreadItemsNotification: function(user, troupesWithUnreadCounts) {
    mailerService.sendEmail({
      templateFile: "unread_notification",
      from: 'Troupe <support@troupe.co>',
      to: user.email,
      subject: "Activity on Troupe",
      data: {
        user: user,
        emailBasePath: nconf.get("email:emailBasePath"),
        troupesWithUnreadCounts: troupesWithUnreadCounts
      }
    });
  }
};