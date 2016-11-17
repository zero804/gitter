'use strict';

var Promise = require('bluebird');
var userSettingsService = require('../../services/user-settings-service');

module.exports = Promise.method(function getSnapshotsForPageContext(req) {
  if (!req.user) return {};
  return userSettingsService.getUserSettings(req.user._id, 'userTheme')
    .then(function(result){
      return (result || {});
    });
});
