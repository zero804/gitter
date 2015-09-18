'use strict';

var userSettingsService = require('../../../services/user-settings-service');

module.exports = {
  id: 'userSetting',

  index: function(req) {
    return userSettingsService.getAllUserSettings(req.resourceUser.id)
      .then(function (settings) {
        return settings || {};
      });
  },

  show: function(req) {
    return userSettingsService.getUserSettings(req.resourceUser.id, req.params.userSetting)
      .then(function(f) {
        return f || {};
      });
  },

  update: function(req) {
    var settings = req.body;

    if (settings.hasOwnProperty('value')) {
      settings = settings.value;
    }

    userSettingsService.setUserSettings(req.resourceUser.id, req.params.userSetting, settings)
      .then(function() {
        return settings;
      });
  }

};
