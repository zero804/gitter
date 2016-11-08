"use strict";

var logger = require('gitter-web-env').logger;
var pushNotificationService = require('../../services/push-notification-service');

module.exports = function(req, res, next) {
  var userId = req.user.id;

  logger.info("Vapid registration", { userId: userId });
  return pushNotificationService.registerVapidSubscription(req.body, userId)
    .then(function() {
      res.status(204).end();
    })
    .catch(next);
};
