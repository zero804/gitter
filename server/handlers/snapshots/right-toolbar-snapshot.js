'use strict';

var userSettingsService = require('../../services/user-settings-service');

module.exports = function getSnapshotsForPageContext(req) {

  var getRightToolbarUserSettings = userSettingsService.getUserSettings(req.user._id, 'rightToolbar');

  return getRightToolbarUserSettings.then(function(rightToolbarUserSettings) {
    return {
      rightToolbar: {
        // Default to pinned
        isPinned: rightToolbarUserSettings.isPinned === undefined ? true : rightToolbarUserSettings.isPinned
      }
    };
  })
};
