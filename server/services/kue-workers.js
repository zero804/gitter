/*jshint globalstrict:true, trailing:false unused:true node:true*/
"use strict";

exports.startWorkers = function() {
  require('./mailer-service').startWorkers();
  require('../gateways/push-notification-gateway').startWorkers();
  require('./notification-generator-service').startWorkers();

  require('./kue-cleanup-service').startCleanupJob();

  var kue = require('kue');
  kue.app.listen(3000);
};
