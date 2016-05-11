"use strict";

var env           = require('gitter-web-env');
var logger        = env.logger;
var config        = env.config;
var errorReporter = env.errorReporter;

var appEvents   = require('gitter-web-appevents');
var roomService = require('../services/room-service');

var installed = false;
exports.install = function() {
  if (installed) return;
  installed = true;

  var splitsvilleEnabled = config.get("project-splitsville:enabled");

  if (!splitsvilleEnabled) {
    appEvents.onRepoRenameDetected(function(oldFullName, newFullName) {
      roomService.renameRepo(oldFullName, newFullName)
        .catch(function(err) {
          logger.error('Error while renaming repo ' + oldFullName + ' to ' + newFullName + ': ' + err, { exception: err });
          errorReporter(err, { oldFullName: oldFullName, newFullName: newFullName }, { module: 'repo-renamer' });
        });
    });

  }

};
