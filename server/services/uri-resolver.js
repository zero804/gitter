'use strict';

var env = require('gitter-web-env');
var logger = env.logger;

var uriLookupService = require("./uri-lookup-service");
var userService = require('./user-service');
var troupeService = require('./troupe-service');
var groupService = require('gitter-web-groups/lib/group-service');
var debug = require('debug')('gitter:app:uri-resolver');
var StatusError = require('statuserror');

function resolveFromLookup(uriLookup, userId) {
  if(uriLookup.userId) {
    /* The uri is for a user */
    return userService.findById(uriLookup.userId)
      .then(function(user) {
        if(!user) {
          return null;
        }

        return {
          user: user,
          uri: user.username,
          room: null,
          roomMember: null,
          group: null
        };
      });
  }

  if(uriLookup.troupeId) {
    /* The uri is for a room */
    return troupeService.findByIdLeanWithMembership(uriLookup.troupeId, userId)
      .spread(function(troupe, roomMember) {
        if(!troupe) return null;

        return {
          user: null,
          uri: troupe.uri,
          room: troupe,
          roomMember: roomMember,
          group: null
        };
      });
  }

  if (uriLookup.groupId) {
    /* The uri is for a group */
    return groupService.findById(uriLookup.groupId)
      .then(function(group) {
        if (group) return null;

        return {
          user: null,
          uri: group.uri,
          room: null,
          roomMember: null,
          group: null
        };

      });
  }

  throw new StatusError(404);
}

/**
 * Returns { user, troupe, roomMember, group }
 */
module.exports = function uriResolver(userId, uri, options) {
  debug("uriResolver %s", uri);
  var ignoreCase = options && options.ignoreCase;

  return uriLookupService.lookupUri(uri)
    .then(function (uriLookup) {
      if (!uriLookup) return null;

      // Resolve the object from the uriLookup
      return resolveFromLookup(uriLookup, userId)
        .tap(function(resolved) {
          // Lookup returned a dud? Remove it...
          if (!resolved) {
            return uriLookupService.removeBadUri(uri);
          }

          // URI mismatch? Perhaps we should redirect...
          if (resolved.uri !== uri) {
            if (ignoreCase && resolved.uri.toLowerCase() === uri.toLowerCase()) {
              logger.info('Ignoring incorrect case for room', { providedUri: uri, correctUri: resolved.uri });
            } else {
              var redirect = new StatusError(301);
              redirect.path = '/' + resolved.uri;
              throw redirect;
            }
          }
        });
    });
};
