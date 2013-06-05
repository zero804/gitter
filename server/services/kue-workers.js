/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

exports.startWorkers = function() {
  var nconf = require("../utils/config");

  require('./mailer-service').startWorkers();
  require('../gateways/push-notification-gateway').startWorkers();
  require('./notifications/push-notification-generator-service').startWorkers();
  require('./thumbnail-preview-generator-service').startWorkers();
  require('./unread-item-service').startWorkers();

  require('./kue-cleanup-service').startCleanupJob();

  if(nconf.get("kue:startAdminApp")) {
    var kue = require('../utils/kue');
    kue.app.listen(nconf.get("kue:adminAppPort"));
  }
};
