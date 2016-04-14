'use strict';

var Promise                       = require('bluebird');
var StatusError                   = require('statuserror');
var userSettingsService           = require('../../../services/user-settings-service');
var userDefaultFlagsService       = require('../../../services/user-default-flags-service');
var userDefaultFlagsUpdateService = require('../../../services/user-default-flags-update-service');

function standardHandler(settingsKey) {
  return {
    get: function(user) {
      return userSettingsService.getUserSettings(user._id, settingsKey);
    },
    set: function(user, value) {
      // Does anyone know why the hell we do this?
      if (value.hasOwnProperty('value')) {
        value = value.value;
      }

      return userSettingsService.setUserSettings(user._id, settingsKey, value)
        .return(value);
    }
  };
}

var SETTINGS = {
  leftRoomMenu: standardHandler('leftRoomMenu'),
  lang: standardHandler('leftRoomMenu'),
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
    var handler = SETTINGS[key];
    if (!handler) throw new StatusError(404);
    return handler;
  });
}

function getSetting(user, key) {
  var handler = SETTINGS[key];
  if (!handler) throw new StatusError(404);
  return handler.get(user)
    .then(function(f) {
      return f || {};
    });
}

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

function updateSetting(user, key, value) {
  var handler = SETTINGS[key];
  if (!handler) throw new StatusError(404);

  return handler.set(user, value);
}

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
  id: 'userSetting',

  show: function(req) {
    var settingsKey = req.params.userSetting;
    var user = req.resourceUser;

    var settings = settingsKey.split(/,/);

    if (settings.length === 1) {
      return getSetting(user, settingsKey);
    } else {
      return getSettings(user, settingsKey.split(','));
    }
  },

  create: function(req) {
    var valuesHash = req.body;
    var user = req.resourceUser;
    return updateSettings(user, valuesHash);
  },

  update: function(req) {
    var value = req.body;
    var user = req.resourceUser;
    var settingsKey = req.params.userSetting;

    return updateSetting(user, settingsKey, value);
  },

  respond: function(req, res, responseBody) {
    switch(req.accepts(['json', 'text'])) {
      case 'json':
        res.send(responseBody);
        break;

      default:
        res.sendStatus(200);
        break;
    }

  }

};
