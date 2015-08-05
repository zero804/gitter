/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var env           = require('gitter-web-env');
var logger        = env.logger;
var errorReporter = env.errorReporter;

var appEvents   = require('gitter-web-appevents');
var roomService = require('../services/room-service');

var installed = false;
exports.install = function() {
  if (installed) return;
  installed = true;

  appEvents.onRepoRenameDetected(function(oldFullName, newFullName) {
    roomService.renameRepo(oldFullName, newFullName)
      .catch(function(err) {
        logger.error('Error while renaming repo ' + oldFullName + ' to ' + newFullName + ': ' + err, { exception: err });
        errorReporter(err, { oldFullName: oldFullName, newFullName: newFullName });
      });
  });
};
