/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var appEvents                 = require('../app-events');
var contactService            = require('./contact-service');
var winston                   = require('winston');
var _                         = require('underscore');
var userService               = require('./user-service');
var presenceService           = require('./presence-service');
var emailNotificationService  = require('./email-notification-service');


function updateContacts(email, user) {
  var userId = user.id;

  return contactService.updateContactsWithUserId(email, userId)
    .then(function(contacts) {
      // Make sure we don't notify the same user more than once
      return _.uniq(contacts.map(function(contact) { return contact.userId; }));
    })
    .then(function(userIds) {
      if(!userIds.length) return;

      return presenceService.categorizeUsersByOnlineStatus(userIds)
        .then(function(results) {
          var offlineUserIds = [];
          userIds.forEach(function(userId) {

            if(results[userId] === 'online') {

              var n = {
                userId: userId,
                title: "Your contact, " + user.displayName + ", has just joined Troupe",
                text: "Click here to connect with them",
                link: user.getHomeUrl()
              };

              winston.silly("Online notifications: ", n);
              appEvents.userNotification(n);
            } else {
              offlineUserIds.push(userId);
            }
          });

          return offlineUserIds;
        })
        .then(function(offlineUserIds) {
          if(!offlineUserIds.length) return [];
          return userService.findByIds(offlineUserIds);
        })
        .then(function(offlineUsers) {
          offlineUsers.forEach(function(offlineUser) {
            emailNotificationService.sendContactSignupNotification(user, offlineUser);
          });
        });


    });
}

exports.install = function() {
  appEvents.localOnly.onEmailConfirmed(function(data) {
    var userId = data.userId;
    var email = data.email;

    winston.info('Email address confirmed', { userId: userId, email: email });

    return userService.findById(userId)
      .then(function(user) {
        if(!user) throw 404;

        // Don't perform the activation if the user is not yet active
        if(user.status !== 'ACTIVE') return;
        return updateContacts(email, user);
      })

      .fail(function(err) {
        winston.error('Contact signup notifier failed' + err, { exception: err });
      });
  });

  appEvents.localOnly.onUserAccountActivated(function(data) {
    var userId = data.userId;

    return userService.findById(userId)
      .then(function(user) {
        if(!user) throw 404;

        return updateContacts(user.email, user);
      })
      .fail(function(err) {
        winston.error('Contact signup notifier failed' + err, { exception: err });
      });
  });

};