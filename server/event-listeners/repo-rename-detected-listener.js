/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var env           = require('../utils/env');
var logger        = env.logger;
var errorReporter = env.errorReporter;

var appEvents   = require('../app-events');
var roomService = require('../services/room-service');

exports.install = function() {
  appEvents.onRepoRenameDetected(function(oldFullName, newFullName) {
    roomService.renameRepo(oldFullName, newFullName)
      .catch(function(err) {
        logger.error('Error while renaming repo ' + oldFullName + ' to ' + newFullName + ': ' + err, { exception: err });
        errorReporter(err, { oldFullName: oldFullName, newFullName: newFullName });
      });
  });
};
