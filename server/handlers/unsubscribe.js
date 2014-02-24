/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var crypto              = require('crypto');
var winston             = require('winston');
var userSettingsService = require('../services/user-settings-service');
var statsService        = require("../services/stats-service");
var nconf               = require('../utils/config');
var passphrase          = nconf.get('email:unsubscribeNotificationsSecret');

module.exports = {
  install: function(app) {
    app.get('/settings/unsubscribe/:hash', function(req, res, next) {

      var plaintext;

      try {
        var decipher  = crypto.createDecipher('aes256', passphrase);
        plaintext     = decipher.update(req.params.hash, 'hex', 'utf8') + decipher.final('utf8');
      } catch(err) {
        res.send(400, 'Invalid hash');
        return;
      }

      var parts             = plaintext.split(',');
      var userId            = parts[0];
      var notificationType  = parts[1];

      winston.info("User " + userId + " opted-out from " + notificationType);
      statsService.event('unsubscribed_unread_notifications', {userId: userId});

      userSettingsService.setUserSettings(userId, 'unread_notifications_optout', 1)
        .then(function() {
          var msg = "Done. You wont receive notifications like that one in the future.";

          res.render('unsubscribe', { layout: 'generic-layout', title: 'Unsubscribe', msg: msg });
        })
        .fail(next);

   });
  }
};
