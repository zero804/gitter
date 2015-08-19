/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var restSerializer   = require("../serializers/rest-serializer");
var presenceService  = require("gitter-web-presence");
var useragent        = require("useragent");
var crypto           = require("crypto");
var roomPermissionsModel = require('../services/room-permissions-model');
var userSettingsService = require('../services/user-settings-service');
var isNative         = require('../../public/js/utils/is-native');

var assert           = require("assert");
var Q                = require('q');
var _                = require('underscore');

/**
 * Returns the promise of a mini-context
 */
exports.generateNonChatContext = function(req) {
  var user = req.user;

  return Q.all([
      user ? serializeUser(user) : null,
      user ? determineDesktopNotifications(user, req) : false,
      user ? userSettingsService.getUserSettings(user.id, 'suggestedRoomsHidden') : false,
    ])
    .spread(function (serializedUser, desktopNotifications, suggestedRoomsHidden) {
      return createTroupeContext(req, {
        user: serializedUser,
        suggestedRoomsHidden: suggestedRoomsHidden,
        desktopNotifications: desktopNotifications,
      });
    });
};

exports.generateSocketContext = function(userId, troupeId) {
  return Q.all([
      userId && serializeUserId(userId),
      troupeId && serializeTroupeId(troupeId, userId) || undefined
    ])
    .spread(function(serializedUser, serializedTroupe) {
      return {
        user: serializedUser,
        troupe: serializedTroupe
      };
    });
};

exports.generateTroupeContext = function(req, extras) {
  var user = req.user;
  var uriContext = req.uriContext;
  assert(uriContext);

  var troupe = req.uriContext.troupe;
  var homeUser = req.uriContext.oneToOne && req.uriContext.otherUser; // The users page being looked at

  var troupeHash;
  if(troupe) {
    var cipher = crypto.createCipher('aes256', '***REMOVED***');
    var hash   = cipher.update(troupe.id, 'utf8', 'hex') + cipher.final('hex');
    troupeHash  = hash;
  }

  return Q.all([
    user ? serializeUser(user) : null,
    homeUser ? serializeHomeUser(homeUser) : undefined, //include email if the user has an invite
    troupe ? serializeTroupe(troupe, user) : undefined,
    determineDesktopNotifications(user, req),
    roomPermissionsModel(user, 'admin', troupe)
  ])
  .spread(function(serializedUser, serializedHomeUser, serializedTroupe, desktopNotifications, adminAccess) {

    var status;
    if(user) {
      status = user.status;
    }

    return createTroupeContext(req, {
      user: serializedUser,
      homeUser: serializedHomeUser,
      troupe: serializedTroupe,
      desktopNotifications: desktopNotifications,
      troupeHash: troupeHash,
      permissions: {
        admin: adminAccess
      },
      extras: extras
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
    return Q.nfcall(presenceService.isUserConnectedWithClientType, user.id, clientType)
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
    showPremiumStatus: true
  });

  return restSerializer.serializeQ(user, strategy);
}

function serializeUserId(userId) {
  var strategy = new restSerializer.UserIdStrategy({
    exposeRawDisplayName: true,
    includeScopes: true,
    includePermissions: true,
    showPremiumStatus: true
  });

  return restSerializer.serializeQ(userId, strategy);
}

function serializeHomeUser(user, includeEmail) {
  var strategy = new restSerializer.UserStrategy({
    includeEmail: includeEmail,
    hideLocation: true
  });

  return restSerializer.serializeQ(user, strategy);
}

function serializeTroupeId(troupeId, userId) {
  var strategy = new restSerializer.TroupeIdStrategy({ currentUserId: userId });

  return restSerializer.serializeQ(troupeId, strategy);
}


function serializeTroupe(troupe, user) {
  var strategy = new restSerializer.TroupeStrategy({ currentUserId: user ? user.id : null });

  return restSerializer.serializeQ(troupe, strategy);
}

function createTroupeContext(req, options) {
  var events = req.session && req.session.events;
  var extras = options.extras || {};
  if (events) { req.session.events = []; }

  return _.extend({
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
    locale: req.i18n.locales[req.i18n.locale]
  }, extras);
}
