/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

exports.startWorkers = function() {

  require('./notifications/push-notification-postbox');

  require('../utils/worker-queue-redis').startScheduler();
};
