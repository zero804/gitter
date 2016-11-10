"use strict";

var assert = require("assert");
var Promise = require('bluebird');
var _ = require('lodash');
var restSerializer = require("../serializers/rest-serializer");
var userService = require('../services/user-service');
var roomMetaService = require('../services/room-meta-service');
var contextGeneratorRequest = require('./context-generator-request');

/**
 * Returns the promise of a mini-context
 */
function generateMainMenuContext(req, leftMenu) {
  var user = req.user;
  var uriContext = req.uriContext;
  var group = uriContext && uriContext.group;

  var troupe = uriContext && uriContext.troupe;
  var roomMember = uriContext && uriContext.roomMember;

  return Promise.all([
      contextGeneratorRequest(req),
      user ? serializeUser(user) : null,
      group ? serializeGroup(group, user) : undefined,
      troupe ? serializeTroupe(troupe, user) : undefined,
    ])
    .spread(function (reqContextHash, serializedUser, serializedGroup, serializedTroupe) {
      // TODO: how is suggestedRoomsHidden different from hasDismissedSuggestions?
      var suggestedRoomsHidden = leftMenu.suggestedRoomsHidden;
      delete leftMenu.suggestedRoomsHidden;

      var serializedContext = _.extend({}, reqContextHash, {
        roomMember: roomMember,
        user: serializedUser,
        group: serializedGroup,
        troupe: serializedTroupe,
        suggestedRoomsHidden: suggestedRoomsHidden,
        leftRoomMenuState: leftMenu,
      });

      return serializedContext;
    });
}

function generateBasicContext(req) {
  var user = req.user;

  return Promise.all([
      contextGeneratorRequest(req),
      user ? serializeUser(user) : null,
    ])
    .spread(function (reqContextHash, serializedUser) {
      return _.extend({}, reqContextHash, {
        user: serializedUser,
      });
    });
}

/**
 * Generates a context for sending over a bayeux connection
 */
function generateSocketContext(userId, troupeId) {
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
        troupe: serializedTroupe || undefined
      };
    });
}

/**
 * Generates the context to send for a main-frame
 */
function generateTroupeContext(req, extras) {
  var user = req.user;
  var uriContext = req.uriContext;
  assert(uriContext);
  var troupe = uriContext.troupe;
  var roomMember = uriContext && uriContext.roomMember;

  return Promise.all([
    contextGeneratorRequest(req),
    user ? serializeUser(user) : null,
    troupe ? serializeTroupe(troupe, user) : undefined,
    troupe && troupe._id ? roomMetaService.findMetaByTroupeId(troupe._id, 'welcomeMessage') : false,
  ])
  .spread(function(reqContextHash, serializedUser, serializedTroupe, welcomeMessage) {
    var roomHasWelcomeMessage = !!(welcomeMessage && welcomeMessage.text && welcomeMessage.text.length);

    return _.extend({}, reqContextHash, {
      roomMember: roomMember,
      user: serializedUser,
      troupe: serializedTroupe,
      roomHasWelcomeMessage: roomHasWelcomeMessage
    }, extras);
  });
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

function serializeGroup(group, user) {
  var strategy = new restSerializer.GroupStrategy({
    currentUser: user,
    currentUserId: user && user._id
  });

  return restSerializer.serializeObject(group, strategy);
}

function serializeTroupeId(troupeId, user) {
  var strategy = new restSerializer.TroupeIdStrategy({
    currentUserId: user ? user.id : null,
    currentUser: user,
    includePermissions: true,
    includeOwner: true,
    includeProviders: true,
    includeGroups: true,
    includeBackend: true,
    includeAssociatedRepo: true
  });

  return restSerializer.serializeObject(troupeId, strategy);
}

function serializeTroupe(troupe, user) {
  var strategy = new restSerializer.TroupeStrategy({
    currentUserId: user ? user.id : null,
    currentUser: user,
    includePermissions: true,
    includeOwner: true,
    includeProviders: true,
    includeGroups: true,
    includeBackend: true,
    includeAssociatedRepo: true
  });

  return restSerializer.serializeObject(troupe, strategy);
}

module.exports = {
  generateBasicContext: generateBasicContext,
  generateMainMenuContext: generateMainMenuContext,
  generateSocketContext: generateSocketContext,
  generateTroupeContext: generateTroupeContext
}
