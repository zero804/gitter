/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var mailerService     = require("./mailer-service");
var nconf             = require('../utils/config');
var statsService      = require("./stats-service");
var crypto            = require('crypto');
var GitHubMeService   = require('./github/github-me-service');
var winston           = require('../utils/winston');

var passphrase        = nconf.get('email:unsubscribeNotificationsSecret');

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
        connectLink: nconf.get("email:emailBasePath") + signupUser.getHomeUrl(),
      }
    });
  },

  sendUnreadItemsNotification: function(user, troupesWithUnreadCounts) {
    var plaintext = user.id + ',' + 'unread_notifications';
    var cipher    = crypto.createCipher('aes256', passphrase);
    var hash      = cipher.update(plaintext, 'utf8', 'hex') + cipher.final('hex');

    var ghMe = new GitHubMeService(user);
    return ghMe.getEmail()
      .then(function(email) {
        if(!email) {
          winston.info('Skipping email notification for ' + user.username + ' as they have no primary confirmed email');
          return;
        }

        statsService.event('unread_notification_sent', {userId: user.id, email: email});

        var emailBasePath = nconf.get("email:emailBasePath");
        var unsubscribeUrl = emailBasePath + '/settings/unsubscribe/' + hash;

        return mailerService.sendEmail({
          templateFile: "unread_notification",
          from: 'Gitter Notifications <support@gitter.im>',
          to: email,
          unsubscribe: unsubscribeUrl,
          subject: "Activity on Gitter",
          data: {
            user: user,
            emailBasePath: emailBasePath,
            troupesWithUnreadCounts: troupesWithUnreadCounts,
            unsubscribeUrl: unsubscribeUrl
          }
        });
      })
      .fail(function(err) {
        winston.error('Unable to send unread items notifications: ' + err, { exception: err });
        throw err;
      });


  }
};
