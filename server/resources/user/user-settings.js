/*jshint node:true */
'use strict';

var userSettingsService = require('../../services/user-settings-service');

module.exports = {
  id: 'userSetting',

  index: function (req, res, next) {
    userSettingsService.getAllUserSettings(req.resourceUser.id)
      .then(function (settings) {
        res.json(settings || {});
      })
      .fail(next);
  },

  show: function (req, res) {
    res.json(req.userSetting.settings || {});
  },

  update: function (req, res, next) {
    var settings = req.body;

    if (settings.hasOwnProperty('value')) {
      settings = settings.value;
    }

    userSettingsService.setUserSettings(req.resourceUser.id, req.userSetting.settingsKey, settings)
      .then(function () {
        res.json(settings);
      })
      .fail(next);
  },

  load: function (req, id, callback) {
    userSettingsService.getUserSettings(req.resourceUser.id, id)
      .then(function (f) {
        return { settingsKey: id, settings: f };
      })
      .nodeify(callback);
  }

};
