"use strict";

var restSerializer   = require("../serializers/rest-serializer");
var presenceService  = require("gitter-web-presence");
var useragent        = require("useragent");
var userService      = require('../services/user-service');
var userSettingsService = require('../services/user-settings-service');
var roomMetaService = require('../services/room-meta-service');
var isNative         = require('../../public/js/utils/is-native');

var assert           = require("assert");
var Promise          = require('bluebird');
var _                = require('underscore');

/**
 * Returns the promise of a mini-context
 */
exports.generateNonChatContext = function(req) {
  var user = req.user;
  var troupe = (req.uriContext || {}).troupe;

  return Promise.all([
      user ? serializeUser(user) : null,
      troupe ? serializeTroupe(troupe, user) : undefined,
      user ? determineDesktopNotifications(user, req) : false,
      user ? userSettingsService.getUserSettings(user.id, 'suggestedRoomsHidden') : false,
      user ? userSettingsService.getUserSettings(user.id, 'leftRoomMenu') : false,
    ])
    .spread(function (serializedUser, serializedTroupe, desktopNotifications, suggestedRoomsHidden, leftRoomMenuState) {
      return createTroupeContext(req, {
        user:                 serializedUser,
        troupe:               serializedTroupe,
        suggestedRoomsHidden: suggestedRoomsHidden,
        desktopNotifications: desktopNotifications,
        leftRoomMenuState:    leftRoomMenuState,
      });
    });
};

exports.generateSocketContext = function(userId, troupeId) {
  function getUser() {
    if (!userId) return Promise.resolve(null);
    return userService.findById(userId);
  }

  return getUser()
    .then(function(user) {
      return [
        user && serializeUser(user),
        troupeId && serializeTroupeId(troupeId, user)
      ];
    })
    .spread(function(serializedUser, serializedTroupe) {
      return {
        user: serializedUser || undefined,
        troupe: serializedTroupe  || undefined
      };
    });
};

exports.generateTroupeContext = function(req, extras) {
  var user = req.user;
  var uriContext = req.uriContext;
  assert(uriContext);

  var troupe = req.uriContext.troupe;

  return Promise.all([
    user ? serializeUser(user) : null,
    troupe ? serializeTroupe(troupe, user) : undefined,
    determineDesktopNotifications(user, req),
    troupe && troupe.id ? roomMetaService.roomHasWelcomeMessage(troupe.id) : false,
  ])
  .spread(function(serializedUser, serializedTroupe, desktopNotifications, roomHasWelcomeMessage) {

    return createTroupeContext(req, {
      user: serializedUser,
      troupe: serializedTroupe,
      desktopNotifications: desktopNotifications,
      extras: extras,
      roomHasWelcomeMessage: roomHasWelcomeMessage,
    });
  });
};

/**
 * Figures out whether to use desktop notifications for this user
 */

function determineDesktopNotifications(user, req) {
  if(!user) return true;

  var agent = useragent.parse(req.headers['user-agent']);
  var os = agent.os.family;
  var clientType;

  if(os === 'Mac OS X') {
    clientType = 'osx';
  } else if(os.indexOf('Windows') === 0) {
    clientType = 'win';
  } else if (os.indexOf('Linux') === 0) {
    clientType= 'linux';
  }

  if(clientType) {
    return presenceService.isUserConnectedWithClientType(user.id, clientType)
      .then(function(result) {
        return !result;
      });
  }

  return true;

}

function isNativeDesktopApp(req) {
  return isNative(req.headers['user-agent']);
}

function serializeUser(user) {
  var strategy = new restSerializer.UserStrategy({
    exposeRawDisplayName: true,
    includeScopes: true,
    includePermissions: true,
    showPremiumStatus: true,
    includeProviders: true
  });

  return restSerializer.serializeObject(user, strategy);
}

function serializeTroupeId(troupeId, user) {
  var strategy = new restSerializer.TroupeIdStrategy({
    currentUserId: user ? user.id : null,
    currentUser: user,
    includePermissions: true,
    includeOwner: true,
    includeProviders: true
  });

  return restSerializer.serializeObject(troupeId, strategy);
}


function serializeTroupe(troupe, user) {
  var strategy = new restSerializer.TroupeStrategy({
    currentUserId: user ? user.id : null,
    currentUser: user,
    includePermissions: true,
    includeOwner: true,
    includeProviders: true
  });

  return restSerializer.serializeObject(troupe, strategy);
}

function createTroupeContext(req, options) {
  var events = req.session && req.session.events;
  var extras = options.extras || {};

  // Pass the feature toggles through to the client
  var features;
  if (req.fflip && req.fflip.features) {
    features = Object.keys(req.fflip.features).filter(function(featureKey) {
      return req.fflip.features[featureKey];
    });
  }

  if (events) { req.session.events = []; }

  return _.extend({
    roomMember: req.uriContext && req.uriContext.roomMember,
    user: options.user,
    troupe: options.troupe,
    homeUser: options.homeUser,
    accessToken: req.accessToken,
    suggestedRoomsHidden: options.suggestedRoomsHidden,
    desktopNotifications: options.desktopNotifications,
    events: events,
    troupeUri: options.troupe ? options.troupe.uri : undefined,
    troupeHash: options.troupeHash,
    isNativeDesktopApp: isNativeDesktopApp(req),
    permissions: options.permissions,
    locale: req.i18n.locales[req.i18n.locale],
    features: features,
    leftRoomMenuState: options.leftRoomMenuState,
    roomHasWelcomeMessage: options.roomHasWelcomeMessage
  }, extras);
}
