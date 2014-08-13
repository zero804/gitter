/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var env                 = require('../utils/env');
var config              = env.config;
var stats               = env.stats;
var logger              = env.logger;
var mailerService       = require("./mailer-service");
var crypto              = require('crypto');
var passphrase          = config.get('email:unsubscribeNotificationsSecret');
var userSettingsService = require('./user-settings-service');
var emailAddressService = require('./email-address-service');

module.exports = {

  sendUnreadItemsNotification: function(user, troupesWithUnreadCounts) {
    var plaintext = user.id + ',' + 'unread_notifications';
    var cipher    = crypto.createCipher('aes256', passphrase);
    var hash      = cipher.update(plaintext, 'utf8', 'hex') + cipher.final('hex');

    if (user.state && user.state === 'INVITED') {
      logger.info('Skipping email notification for ' + user.username + ', in INVITED state.');
      return;
    }

    return emailAddressService(user)
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

    return emailAddressService(toUser)
      .then(function(email) {
        if (!email) return;

        stats.event('invitation_sent', { userId: toUser.id, email: email });

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
    });
  },

  addedToRoomNotification: function(fromUser, toUser, room) {
    var plaintext       = toUser.id + ',' + 'unread_notifications';
    var cipher          = crypto.createCipher('aes256', passphrase);
    var hash            = cipher.update(plaintext, 'utf8', 'hex') + cipher.final('hex');
    var emailBasePath   = config.get("email:emailBasePath");
    var unsubscribeUrl  = emailBasePath + '/settings/unsubscribe/' + hash;

    var senderName = fromUser.displayName;
    var recipientName = toUser.displayName;

    userSettingsService.getUserSettings(toUser.id, 'unread_notifications_optout')
      .then(function(optout) {
        if (optout) {
          logger.info('Skipping email notification for ' + toUser.username + ' because opt-out');
          return;
        }

        return emailAddressService(toUser)
          .then(function(email) {
            if (!email) {
              logger.info('Skipping email notification for ' + toUser.username + ' as they have no primary confirmed email');
              return;
            }

            stats.event('added_to_room_notification_sent', {userId: toUser.id, email: email});

            return mailerService.sendEmail({
              templateFile: "added_to_room",
              from: senderName + ' <support@gitter.im>',
              to: email,
              subject: '[' + room.uri + '] You\'ve been added to a new room on Gitter',
              data: {
                roomUri: room.uri,
                roomUrl: config.get("email:emailBasePath") + '/' + room.uri,
                senderName: senderName,
                recipientName: recipientName,
                unsubscribeUrl: unsubscribeUrl
              }
            });
        });
    });

  }

};
