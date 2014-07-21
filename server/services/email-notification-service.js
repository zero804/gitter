/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var env               = require('../utils/env');
var config            = env.config;
var stats             = env.stats;
var logger            = env.logger;

var mailerService     = require("./mailer-service");
var crypto            = require('crypto');
var GitHubMeService   = require('./github/github-me-service');

var passphrase        = config.get('email:unsubscribeNotificationsSecret');

module.exports = {
  sendContactSignupNotification: function(signupUser, toUser) {
    var signupDisplayName = signupUser.displayName;
    var email = toUser.email;

    return mailerService.sendEmail({
      templateFile: "contact_signup_notification",
      from: 'Troupe <support@troupe.co>',
      to: email,
      subject: signupDisplayName + " has joined Troupe",
      data: {
        signupDisplayName: signupDisplayName,
        connectLink: config.get("email:emailBasePath") + signupUser.getHomeUrl(),
      }
    });
  },

  sendUnreadItemsNotification: function(user, troupesWithUnreadCounts) {
    var plaintext = user.id + ',' + 'unread_notifications';
    var cipher    = crypto.createCipher('aes256', passphrase);
    var hash      = cipher.update(plaintext, 'utf8', 'hex') + cipher.final('hex');

    if (user.state && user.state === 'INVITED') {
      logger.info('Skipping email notification for ' + user.username + ', in INVITED state.');
      return;
    }


    var ghMe = new GitHubMeService(user);
    return ghMe.getEmail()
      .then(function(email) {
        if(!email) {
          logger.info('Skipping email notification for ' + user.username + ' as they have no primary confirmed email');
          return;
        }

        stats.event('unread_notification_sent', {userId: user.id, email: email});

        var emailBasePath = config.get("email:emailBasePath");
        var unsubscribeUrl = emailBasePath + '/settings/unsubscribe/' + hash;
        var canChangeNotifySettings = troupesWithUnreadCounts.some(function(troupeWithUnreadCounts) {
          return !troupeWithUnreadCounts.troupe.oneToOne;
        });


        return mailerService.sendEmail({
          templateFile: "unread_notification",
          from: 'Gitter Notifications <support@gitter.im>',
          to: email,
          unsubscribe: unsubscribeUrl,
          subject: "Activity on Gitter",
          data: {
            canChangeNotifySettings: canChangeNotifySettings,
            user: user,
            emailBasePath: emailBasePath,
            troupesWithUnreadCounts: troupesWithUnreadCounts,
            unsubscribeUrl: unsubscribeUrl
          }
        });
      })
      .fail(function(err) {
        logger.error('Unable to send unread items notifications: ' + err, { exception: err });
        throw err;
      });


  },

  sendInvitation: function(fromUser, toUser, room) {
    var senderName = fromUser.displayName;
    var recipientName = toUser.displayName;
    var email = toUser.emails[0];

    if (!email) return;

    return mailerService.sendEmail({
      templateFile: "invitation",
      from: senderName + ' <support@gitter.im>',
      to: email,
      subject: '[' + room.uri + '] Join the chat on Gitter',
      data: {
        roomUri: room.uri,
        roomUrl: config.get("email:emailBasePath") + '/' + room.uri,
        senderName: senderName,
        recipientName: recipientName
      }
    });
  },

  addedToRoomNotification: function(fromUser, toUser, room) {
    var senderName = fromUser.displayName;
    var recipientName = toUser.displayName;
    var email = toUser.emails[0];

    if (!email) return;

    return mailerService.sendEmail({
      templateFile: "added_to_room",
      from: senderName + ' <support@gitter.im>',
      to: email,
      subject: '[' + room.uri + '] Join the chat on Gitter',
      data: {
        roomUri: room.uri,
        roomUrl: config.get("email:emailBasePath") + '/' + room.uri,
        senderName: senderName,
        recipientName: recipientName
      }
    });

  }

};
