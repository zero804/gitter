"use strict";

var userTroupeSettingsService = require("../../../services/user-troupe-settings-service");

module.exports = {
  id: 'setting',
  index: function(req) {
    return userTroupeSettingsService.getAllUserSettings(req.resourceUser.id, req.params.userTroupeId)
      .then(function(settings) {
        return settings || {};
      });
  },

  show: function(req) {
    return userTroupeSettingsService.getUserSettings(req.resourceUser.id, req.params.userTroupeId, req.params.setting)
      .then(function(f) {
        return f || {};
      });
  },

  update: function(req) {
    var settings = req.body;
    return userTroupeSettingsService.setUserSettings(req.resourceUser.id, req.params.userTroupeId, req.params.setting, settings);
  }

};
