"use strict";

var userTroupeSettingsService = require("../../../services/user-troupe-settings-service");

module.exports = {
  id: 'setting',
  index: function(req, res, next) {
    userTroupeSettingsService.getAllUserSettings(req.resourceUser.id, req.params.userTroupeId)
      .then(function(settings) {
        res.json(settings || {});
      })
      .catch(next);
  },

  show: function(req, res, next) {
    userTroupeSettingsService.getUserSettings(req.resourceUser.id, req.params.userTroupeId, req.params.setting)
      .then(function(f) {
        res.json(f || {});
      })
      .catch(next);
  },

  update: function(req, res, next) {
    var settings = req.body;
    userTroupeSettingsService.setUserSettings(req.resourceUser.id, req.params.userTroupeId, req.params.setting, settings)
      .then(function() {
        res.json(settings);
      })
      .catch(next);
  }

};
