'use strict';

var userSettingsService = require('../../services/user-settings-service');

module.exports = function getSnapshotsForPageContext(req) {
  if (!req.user) return {};
  return userSettingsService.getUserSettings(req.user._id, 'rightToolbar')
    .then(function(rightToolbarUserSettings) {
      var isPinned;

      if (!rightToolbarUserSettings || rightToolbarUserSettings.isPinned === undefined) {
        // Default to pinned
        isPinned = true;
      } else {
        isPinned = rightToolbarUserSettings.isPinned;
      }
      return {
        rightToolbar: {
          isPinned: isPinned
        }
      };
    });
};
