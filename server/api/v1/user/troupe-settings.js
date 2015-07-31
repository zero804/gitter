/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var userTroupeSettingsService = require("../../../services/user-troupe-settings-service");

module.exports = {
  id: 'setting',
  index: function(req, res, next) {
    userTroupeSettingsService.getAllUserSettings(req.resourceUser.id, req.userTroupe.id)
      .then(function(settings) {
        res.json(settings || {});
      })
      .fail(next);
  },

  show: function(req, res) {
    res.json(req.setting.settings || {});
  },

  update: function(req, res, next) {
    var settings = req.body;
    userTroupeSettingsService.setUserSettings(req.resourceUser.id, req.userTroupe.id, req.setting.settingsKey, settings)
      .then(function() {
        res.json(settings);
      })
      .fail(next);
  },

  load: function(req, id, callback) {
    userTroupeSettingsService.getUserSettings(req.resourceUser.id, req.userTroupe.id, id)
      .then(function(f) {
        return { settingsKey: id, settings: f };
      })
      .nodeify(callback);
  }

};
