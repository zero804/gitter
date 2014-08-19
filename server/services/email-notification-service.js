/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var env                 = require('../utils/env');
var config              = env.config;

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
          tracking: {
            event: 'unread_notification_sent',
            data: { userId: user.id, email: email }
          },
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

        return mailerService.sendEmail({
          templateFile: "invitation",
          from: senderName + ' <support@gitter.im>',
          to: email,
          subject: '[' + room.uri + '] Join the chat on Gitter',
          tracking: {
            event: 'invitation_sent',
            data: { userId: user.id, email: email }
          },
          data: {
            roomUri: room.uri,
            roomUrl: config.get("email:emailBasePath") + '/' + room.uri,
            senderName: senderName,
            recipientName: recipientName
          }
        });
    });
  },
  
  /**
   * createdRoomNotification() emails suggested actions for created rooms (`PUBLIC` or `PRIVATE`)
   *
   * user     User - the room's owner 
   * room     Room - the room
   */
  createdRoomNotification: function (user, room) {
    var plaintext = user.id + ',' + 'created_room';
    var cipher    = crypto.createCipher('aes256', passphrase);
    var hash      = cipher.update(plaintext, 'utf8', 'hex') + cipher.final('hex');
    var emailBasePath = config.get("email:emailBasePath");
    var unsubscribeUrl = emailBasePath + '/settings/unsubscribe/' + hash;
    
    var isPublic = (room && room.security === 'PUBLIC') ? true : false;
    
    return emailAddressService(user)
      .then(function (email) {
        var shareURL = config.get('web:basepath') + '/' + room.uri;
        
        // TODO move the generation of tweet links into it's own function?
        var twitterURL = (isPublic) ? 'http://twitter.com/intent/tweet?url=' + shareURL + '&text=' + encodeURIComponent('I have just created the room ' + room.name) + '&via=gitchat' : undefined; // if the room is public we shall have a tweet link

        return mailerService.sendEmail({
          templateFile: "created_room",
          from: 'Gitter Notifications <support@gitter.im>',
          to: email,
          unsubscribe: unsubscribeUrl,
          subject: "Recently Created Room",
          tracking: {
            event: 'created_room_email_sent',
            data: { userId: user.id, email: email }
          },
          data: {
            user: user,
            room: room,
            shareURL: shareURL,
            twitterURL: twitterURL,
            unsubscribeUrl: unsubscribeUrl
          }
        });
      })
      .fail(function (err) {
        logger.error('Unable to send unread items notifications: ' + err, { exception: err });
        throw err;
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

            return mailerService.sendEmail({
              templateFile: "added_to_room",
              from: senderName + ' <support@gitter.im>',
              to: email,
              subject: '[' + room.uri + '] You\'ve been added to a new room on Gitter',
              tracking: {
                event: 'added_to_room_notification_sent',
                data: { userId: toUser.id, email: email }
              },
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
