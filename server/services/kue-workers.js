/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

exports.startWorkers = function() {
  //var nconf = require("../utils/config");

  require('./mailer-service');

  require('./notifications/push-notification-postbox');

  require('../utils/worker-queue').startWorkers();

  require('../utils/worker-queue-redis').startScheduler();
};
