'use strict';

var userSettingsService = require('../../services/user-settings-service');

module.exports = function getSnapshotsForPageContext(req) {
  if (!req.user) return {};
  return userSettingsService.getUserSettings(req.user._id, 'userTheme')
    .then(function(result){
      result = (result || {});
      return result.theme
    });
};
