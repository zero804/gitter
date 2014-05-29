/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

exports.startWorkers = function() {
  //var nconf = require("../utils/config");

  require('./mailer-service');
  // require('../gateways/push-notification-gateway');
  require('./notifications/push-notification-generator-service');
  // require('./thumbnail-preview-generator-service');
  require('./unread-item-service');

  require('../utils/worker-queue').startWorkers();
};
