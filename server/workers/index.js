"use strict";

var listening = false;

exports.listen = function() {
  if (listening) return;
  listening = true;

  require('../utils/worker-queue-redis').startScheduler();
  require('../services/readby-service').listen();
  require('../services/unread-item-service').listen();
  require('../services/notifications/push-notification-postbox').listen();

};
