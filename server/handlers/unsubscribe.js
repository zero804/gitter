/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var env                 = require('gitter-web-env');
var logger              = env.logger;
var stats               = env.stats;
var config              = env.config;

var ensureLoggedIn      = require('../web/middlewares/ensure-logged-in');

var crypto              = require('crypto');
var userSettingsService = require('../services/user-settings-service');
var passphrase          = config.get('email:unsubscribeNotificationsSecret');

module.exports = {
  install: function (app) {
    app.get('/settings/unsubscribe/:hash', function (req, res, next) {

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

      logger.info("User " + userId + " opted-out from " + notificationType);
      stats.event('unsubscribed_unread_notifications', {userId: userId});

      userSettingsService.setUserSettings(userId, 'unread_notifications_optout', 1)
        .then(function () {
          var msg = "Done. You wont receive notifications like that one in the future.";

          res.render('unsubscribe', { layout: 'generic-layout', title: 'Unsubscribe', msg: msg });
        })
        .fail(next);

    });

    app.get('/settings/badger/opt-out',
      ensureLoggedIn,
      function (req, res, next) {
        var userId = req.user.id;

        logger.info("User " + userId + " opted-out from auto badgers");
        stats.event('optout_badger', { userId: userId });

        return userSettingsService.setUserSettings(userId, 'badger_optout', 1)
          .then(function () {
            var msg = "Done. We won't send you automatic pull-requests in future.";

            res.render('unsubscribe', {
              layout: 'generic-layout',
              title: 'Opt-out',
              msg: msg
            });
          })
          .fail(next);
      });
  }
};
