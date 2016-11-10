'use strict';

var userSettingsService = require('../../services/user-settings-service');

module.exports = function getSnapshotsForPageContext(req) {
  if (!req.user) return {};
  return userSettingsService.getUserSettings(req.user._id, 'profileMenu')
    .then(function(profileMenuUserSettings) {
      var hasDarkTheme;

      if (!profileMenuUserSettings || profileMenuUserSettings.hasDarkTheme === undefined) {
        // Default to pinned
        hasDarkTheme = false;
      } else {
        hasDarkTheme = profileMenuUserSettings.hasDarkTheme;
      }
      return {
        hasDarkTheme: hasDarkTheme
      };
    });
};
