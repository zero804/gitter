'use strict';

var Promise = require('bluebird');
var StatusError = require('statuserror');
var userSettingsService = require('./user-settings-service');
var userDefaultFlagsService = require('./user-default-flags-service');
var userDefaultFlagsUpdateService = require('./user-default-flags-update-service');

function standardHandler(settingsKey) {
  return {
    get: function(user) {
      return userSettingsService.getUserSettings(user._id, settingsKey);
    },
    set: function(user, value) {
      return userSettingsService.setUserSettings(user._id, settingsKey, value)
        .return(value);
    }
  };
}

/**
 * Each setting key can have it's own handler.
 * This maps the setting key to a read and write handler.
 * If the user attempts to write to an unknown key, we throw a
 * 404 error
 */
var HANDLERS = {
  /* Left Room Menu */
  leftRoomMenu: standardHandler('leftRoomMenu'),
  rightToolbar: standardHandler('rightToolbar'),

  /* Lang */
  lang: standardHandler('lang'),

  /* Unread Emails Opt-out */
  unread_notifications_optout: {
    get: function(user) {
      return userSettingsService.getUserSettings(user._id, 'unread_notifications_optout')
        .then(function(value) {
          return !!value;
        });
    },
    set: function(user, value) {
      return userSettingsService.setUserSettings(user._id, 'unread_notifications_optout', value ? 1 : 0)
        .then(function() {
          return !!value;
        });
    }
  },

  /* Default Notification Settings Mode */
  defaultRoomMode: {
    get: function(user) {
      return userDefaultFlagsService.getDefaultFlagDetailsForUserId(user._id);
    },
    set: function(user, value) {
      var mode = value.mode;
      var override = value.override;

      return userDefaultFlagsUpdateService.updateDefaultModeForUser(user, mode, override)
        .then(function() {
          return userDefaultFlagsService.getDefaultFlagDetailsForUserId(user._id);
        });
    }
  }
};

function mapHandlers(keys) {
  return keys.map(function(key) {
    var handler = HANDLERS[key];
    if (!handler) throw new StatusError(404);
    return handler;
  });
}

function getSetting(user, key) {
  var handler = HANDLERS[key];
  if (!handler) throw new StatusError(404);
  return handler.get(user)
    .then(function(f) {
      return f || {};
    });
}

/**
 * Returns multiple setting keys as a hash
 */
function getSettings(user, keys) {
  var handlers = mapHandlers(keys);
  return Promise.map(handlers, function(handler) {
    return handler.get(user);
  })
  .then(function(results) {
    return keys.reduce(function(memo, key, index) {
      memo[key] = results[index];
      return memo;
    }, {});
  });
}

/**
 * Updates a single key
 */
function updateSetting(user, key, value) {
  var handler = HANDLERS[key];
  if (!handler) throw new StatusError(404);

  return handler.set(user, value);
}

/**
 * Updates multiple key settings from a hash
 * All keys need to be valid, otherwise we throw
 * a 404
 */
function updateSettings(user, valuesHash) {
  var keys = Object.keys(valuesHash);
  var handlers = mapHandlers(keys);

  return Promise.map(handlers, function(handler, index) {
    var key = keys[index];
    var value = valuesHash[key];
    return handler.set(user, value);
  })
  .then(function(results) {
    return keys.reduce(function(memo, key, index) {
      memo[key] = results[index];
      return memo;
    }, {});
  });
}

module.exports = {
  getSetting: getSetting,
  getSettings: getSettings,
  updateSetting: updateSetting,
  updateSettings: updateSettings
};
