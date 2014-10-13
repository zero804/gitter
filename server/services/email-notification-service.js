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
var roomNameTrimmer     = require('../utils/room-name-trimmer');
var mongoUtils          = require('../utils/mongo-utils');
var moment              = require('moment');
var Q                   = require('q');

/*
 * Return a nice sane
 */
function calculateSubjectForUnreadEmail(troupesWithUnreadCounts) {
  var allOneToOne = true;
  var roomNames = troupesWithUnreadCounts.map(function(d) {
    if(d.troupe.oneToOne) {
      return d.troupe.user.username;
    } else {
      allOneToOne = false;
      return roomNameTrimmer(d.troupe.uri);
    }
  });

  switch(roomNames.length) {
    case 0: return "Unread messages on Gitter"; // Wha??
    case 1:
      if(allOneToOne) {
        return "Unread messages from " + roomNames[0];
      } else {
        return "Unread messages in " + roomNames[0];
      }
      break;
    case 2:
      if(allOneToOne) {
        return "Unread messages from " + roomNames[0] + ' and ' + roomNames[1];
      } else {
        return "Unread messages in " + roomNames[0] + ' and ' + roomNames[1];
      }
      break;
    case 3:
      if(allOneToOne) {
        return "Unread messages from " + roomNames[0] + ', ' + roomNames[1] + ' and one other';
      } else {
        return "Unread messages in " + roomNames[0] + ', ' + roomNames[1] + ' and one other';
      }
      break;
    default:
      if(allOneToOne) {
        return "Unread messages from " + roomNames[0] + ', ' + roomNames[1] + ' and ' + (roomNames.length - 2) + ' others';
      } else {
        return "Unread messages in " + roomNames[0] + ', ' + roomNames[1] + ' and ' + (roomNames.length - 2) + ' others';
      }
  }
}

/*
 * Send invitation and reminder emails to the provided address.
 */
function sendInvite(fromUser, toUser, room, email, template, eventName) {
  if (!email) return;

  var senderName    = (fromUser.displayName || fromUser.username);
  var recipientName = (toUser.displayName || toUser.username).split(' ')[0];
  var date          = moment(mongoUtils.getTimestampFromObjectId(toUser._id)).format('Do MMMM YYYY');

  return mailerService.sendEmail({
    templateFile:   template,
    from:           senderName + ' <support@gitter.im>',
    fromName:       senderName,
    to:             email,
    subject:        '[' + room.uri + '] Join the chat on Gitter',
    tracking: {
      event: eventName,
      data: { email: email }
    },
    data: {
      date: date,
      roomUri: room.uri,
      roomUrl: config.get("email:emailBasePath") + '/' + room.uri,
      senderName: senderName,
      recipientName: recipientName
    }
  });
}

module.exports = {

  sendUnreadItemsNotification: function(user, troupesWithUnreadCounts) {
    var plaintext = user.id + ',' + 'unread_notifications';
    var cipher    = crypto.createCipher('aes256', passphrase);
    var hash      = cipher.update(plaintext, 'utf8', 'hex') + cipher.final('hex');

    if (user.state) {
      logger.info('Skipping email notification for ' + user.username + ', not active state.');
      return Q.resolve();
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

        troupesWithUnreadCounts.forEach(function(d) {
            d.truncated = d.chats.length < d.unreadCount;
          }
        );

        var subject = calculateSubjectForUnreadEmail(troupesWithUnreadCounts);

        return mailerService.sendEmail({
          templateFile: "unread_notification",
          from: 'Gitter Notifications <support@gitter.im>',
          to: email,
          unsubscribe: unsubscribeUrl,
          subject: subject,
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
    return emailAddressService(toUser)
    .then(function(email) {
      return sendInvite(fromUser, toUser, room, email, 'invitation', 'invitation_sent');
    });
  },

  sendInvitationReminder: function(fromUser, toUser, room) {
    var preferStoredEmail = true;
    return emailAddressService(toUser, preferStoredEmail)
    .then(function(email) {
      return sendInvite(fromUser, toUser, room, email, 'invitation-reminder', 'invitation_reminder_sent');
    });
  },

  sendManualInvitation: function(fromUser, toUser, room, email) {
    return sendInvite(fromUser, toUser, room, email, 'invitation', 'invitation_sent');
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
    var isOrg = (room && room.security === 'ORG_ROOM') ? true : false;

    // TODO maybe logic can be better?
    if (!isPublic && !isOrg) return; // we only want to send emails if the room is a public or an org room

    return emailAddressService(user)
      .then(function (email) {
        var shareURL = config.get('web:basepath') + '/' + room.uri;

        // TODO move the generation of tweet links into it's own function?
        var twitterURL = (isPublic) ? 'http://twitter.com/intent/tweet?url=' + shareURL + '&text=' + encodeURIComponent('Join me in the ' + room.uri + ' chat room on Gitter') + '&via=gitchat' : undefined; // if the room is public we shall have a tweet link

        return mailerService.sendEmail({
          templateFile: "created_room",
          from: 'Gitter Notifications <support@gitter.im>',
          to: email,
          unsubscribe: unsubscribeUrl,
          subject: "Your new chat room on Gitter",
          tracking: {
            event: 'created_room_email_sent',
            data: { userId: user.id, email: email }
          },
          data: {
            user: user,
            room: room,
            isPublic: isPublic,
            isOrg: isOrg,
            roomType: room.security.toLowerCase(),
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

    var senderName = (fromUser.displayName || fromUser.username).split(' ')[0];
    var recipientName = (toUser.displayName || toUser.username).split(' ')[0];
    var fromName = (fromUser.displayName || fromUser.username);

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
              fromName: fromName,
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

module.exports.testOnly = {
  calculateSubjectForUnreadEmail: calculateSubjectForUnreadEmail
};
