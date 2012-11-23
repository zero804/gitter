/*jslint node: true */
"use strict";

exports.startWorkers = function() {
  require('./mailer-service').startWorkers();
  require('./kue-cleanup-service').startCleanupJob();

  var kue = require('kue');
  kue.app.listen(3000);
};
