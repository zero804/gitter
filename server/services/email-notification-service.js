"use strict";

var env = require('gitter-web-env');
var config = env.config;
var logger = env.logger;
var mailerService = require("./mailer-service");
var crypto = require('crypto');
var passphrase = config.get('email:unsubscribeNotificationsSecret');
var userSettingsService = require('./user-settings-service');
var emailAddressService = require('./email-address-service');
var roomNameTrimmer = require('../../public/js/utils/room-name-trimmer');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var moment = require('moment');
var Promise = require('bluebird');
var i18nFactory = require('gitter-web-i18n');

/*
 * Return a nice sane
 */
function calculateSubjectForUnreadEmail(i18n, troupesWithUnreadCounts) {
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
    case 0: return i18n.__("Unread messages on Gitter"); // Wha??
    case 1:
      if(allOneToOne) {
        return i18n.__("Unread messages from %s", roomNames[0]);
      } else {
        return i18n.__("Unread messages in %s", roomNames[0]);
      }
      /* break; */

    case 2:
      if(allOneToOne) {
        return i18n.__("Unread messages from %s and %s", roomNames[0], roomNames[1]);
      } else {
        return i18n.__("Unread messages in %s and %s", roomNames[0], roomNames[1]);
      }
      /* break; */

    default:
      if(allOneToOne) {
        return i18n.__n("Unread messages from %%s, %%s and one other", "Unread messages from %%s, %%s and %d others", roomNames.length - 2, roomNames[0], roomNames[1]);
      } else {
        return i18n.__n("Unread messages in %%s, %%s and one other", "Unread messages in %%s, %%s and %d others", roomNames.length - 2, roomNames[0], roomNames[1]);
      }
  }
}

/*
 * Send invitation and reminder emails to the provided address.
 */
function sendInvite(invitingUser, invite, room, template, eventName) {
  var email = invite.emailAddress;

  var senderName = (invitingUser.displayName || invitingUser.username);
  var date = moment(mongoUtils.getTimestampFromObjectId(invite._id)).format('Do MMMM YYYY');
  var emailBasePath = config.get("email:emailBasePath");
  var inviteUrl = emailBasePath + '/settings/accept-invite/' + invite.secret;
  var roomUrl = emailBasePath + '/' + room.uri;

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
      roomUrl: roomUrl,
      inviteUrl: inviteUrl,
      senderName: senderName
    }
  });
}

module.exports = {

  sendUnreadItemsNotification: Promise.method(function(user, troupesWithUnreadCounts) {
    var plaintext = user.id + ',' + 'unread_notifications';
    var cipher = crypto.createCipher('aes256', passphrase);
    var hash = cipher.update(plaintext, 'utf8', 'hex') + cipher.final('hex');

    if (user.state) {
      logger.info('Skipping email notification for ' + user.username + ', not active state.');
      return;
    }

    return Promise.join(emailAddressService(user), userSettingsService.getUserSettings(user.id, 'lang'),
      function(email, lang) {
        if(!email) {
          logger.info('Skipping email notification for ' + user.username + ' as they have no primary confirmed email');
          return;
        }

        var i18n = i18nFactory.get();

        if (lang) {
          i18n.setLocale(lang);
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

        var subject = calculateSubjectForUnreadEmail(i18n, troupesWithUnreadCounts);
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
              // #lang Disabling localised emails until we have more content
              // lang: lang,
              i18n: i18n,
              canChangeNotifySettings: canChangeNotifySettings,
              user: user,
              emailBasePath: emailBasePath,
              troupesWithUnreadCounts: troupesWithUnreadCounts,
              unsubscribeUrl: unsubscribeUrl
            }
          })
          .catch(function(err) {
            logger.error('Email send failed: ' + err, { email: email, subject: subject, exception: err });
            throw err;
          });
      })
      .catch(function(err) {
        logger.error('Unable to send unread items notifications: ' + err, { exception: err });
        throw err;
      });
  }),

  sendInvitation: function(invitingUser, invite, room) {
    return sendInvite(invitingUser, invite, room, 'invitation-v2', 'invitation_sent');
  },

  sendInvitationReminder: Promise.method(function(invitedByUser, invite, room) {
    return sendInvite(invitedByUser, invite, room, 'invitation-reminder-v2', 'invitation_reminder_sent');
  }),

  /**
   * createdRoomNotification() emails suggested actions for created rooms (`PUBLIC` or `PRIVATE`)
   *
   * user     User - the room's owner
   * room     Room - the room
   */
  createdRoomNotification: Promise.method(function (user, room) {
    var plaintext = user.id + ',' + 'created_room';
    var cipher = crypto.createCipher('aes256', passphrase);
    var hash = cipher.update(plaintext, 'utf8', 'hex') + cipher.final('hex');
    var emailBasePath = config.get("email:emailBasePath");
    var unsubscribeUrl = emailBasePath + '/settings/unsubscribe/' + hash;

    var isPublic = !!(room && room.security === 'PUBLIC');
    var isOrg = !!(room && room.security === 'ORG_ROOM');

    var recipientName = (user.displayName || user.username).split(' ')[0];

    // TODO maybe logic can be better?
    if (!isPublic && !isOrg) return; // we only want to send emails if the room is a public or an org room

    return emailAddressService(user)
      .then(function (email) {
        var roomUrl = config.get("email:emailBasePath") + '/' + room.uri;

        // TODO move the generation of tweet links into it's own function?
        var twitterURL = (isPublic) ? 'http://twitter.com/intent/tweet?url=' + roomUrl + '&text=' + encodeURIComponent('Join me in the ' + room.uri + ' chat room on Gitter') + '&via=gitchat' : undefined; // if the room is public we shall have a tweet link

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
            unsubscribeUrl: unsubscribeUrl,
            recipientName: recipientName,
            roomType: room.security.toLowerCase(),
            roomUri: room.uri,
            roomUrl: roomUrl,
            twitterURL: twitterURL
          }
        });
      })
      .catch(function(err) {
        logger.error('Unable to send unread items notifications: ' + err, { exception: err });
        throw err;
      });
  }),

  addedToRoomNotification: Promise.method(function(fromUser, toUser, room) {
    var plaintext = toUser.id + ',' + 'unread_notifications';
    var cipher = crypto.createCipher('aes256', passphrase);
    var hash = cipher.update(plaintext, 'utf8', 'hex') + cipher.final('hex');
    var emailBasePath = config.get("email:emailBasePath");
    var unsubscribeUrl = emailBasePath + '/settings/unsubscribe/' + hash;

    var senderName = (fromUser.displayName || fromUser.username).split(' ')[0];
    var recipientName = (toUser.displayName || toUser.username).split(' ')[0];
    var fromName = (fromUser.displayName || fromUser.username);

    return userSettingsService.getUserSettings(toUser.id, 'unread_notifications_optout')
      .then(function(optout) {
        if (optout) {
          logger.info('Skipping email notification for ' + toUser.username + ' because opt-out');
          return;
        }

        return emailAddressService(toUser, { attemptDiscovery: true })
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
  })
};

module.exports.testOnly = {
  calculateSubjectForUnreadEmail: calculateSubjectForUnreadEmail
};
