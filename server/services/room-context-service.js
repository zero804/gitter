'use strict';

var uriResolver          = require('./uri-resolver');
var StatusError          = require('statuserror');
var troupeService        = require('./troupe-service');
var debug                = require('debug')('gitter:room-context-service');
var roomPermissionsModel = require('./room-permissions-model');
var permissionsModel     = require('./permissions-model');
var Promise              = require('bluebird');

/**
 * Given a user and a URI returns (promise of) a context object.
 * The context object looks like:
 * ```js
 * {
 *   troupe: ....,       // The resolved room
 *   uri: ....,          // The uri of the resolved room
 *   oneToOneUser: ....  // Optional. For a one-to-one, the other user
 * }
 * ```
 *
 * Various exceptions can be thrown:
 * 400: uri not supplied
 * 301: redirect
 * 401: login required
 * 404: access denied
 */
function findContextForUri(user, uri, options) {
  debug("findRoomContext %s %s %j", user && user.username, uri, options);

  var userId = user && user.id;

  if (!uri) return Promise.reject(new StatusError(400, 'uri required'));

  /* First off, try use local data to figure out what this url is for */
  return uriResolver(user && user.id, uri, options)
    .spread(function (resolvedUser, resolvedTroupe, roomMember) {

      // The uri resolved to a user, we need to do a one-to-one
      if(resolvedUser) {
        if(!user) {
          debug("uriResolver returned user for uri=%s", uri);
          throw new StatusError(401); // Login required
        }

        if(resolvedUser.id == userId) {
          var redirect = new StatusError(301);
          redirect.path = '/home'; // TODO: is this a good idea??
          throw redirect;
        }

        debug("localUriLookup returned user for uri=%s. Finding or creating one-to-one", uri);

        // For now, we'll always create a one-to-one room
        // In future, this will change to a new model
        return permissionsModel(user, 'view', resolvedUser.username, 'ONETOONE', null)
          .then(function(access) {
            if(!access) throw new StatusError(404);

            return troupeService.findOrCreateOneToOneTroupeIfPossible(userId, resolvedUser.id)
              .spread(function(troupe, resolvedUser) {
                return {
                  troupe: troupe,
                  roomMember: true,
                  oneToOneUser: resolvedUser,
                  uri: resolvedUser.username
                };
              });
          });
      }

      if (resolvedTroupe) {
        if (roomMember) {
          // TODO: periodically check whether the user still has access
          return {
            troupe: resolvedTroupe,
            uri: resolvedTroupe.uri,
            roomMember: true
          };
        }

        return roomPermissionsModel(user, 'view', resolvedTroupe)
          .then(function(access) {
            if (!access) {
              var error = new StatusError(404);

              error.githubType = resolvedTroupe.githubType;
              error.uri = resolvedTroupe.uri;
              throw error;
            }

            return {
              troupe: resolvedTroupe,
              uri: resolvedTroupe.uri,
              roomMember: false
            };
          });
      }

      // No user, no room. 404
      throw new StatusError(404);
    });

}

// TODO: needs work, needs to expose roomMember
function findContextForId(user, troupeId, readOnly) {
  return troupeService.findByIdLeanWithAccess(troupeId, user.id)
    .spread(function(troupe, access) {
      if (!troupe) throw new StatusError(404);

      if (access) return troupe;

      if(troupe.security === 'PUBLIC' && readOnly) {
        return troupe;
      }

      /* From this point forward we need a user */
      if(!user) {
        throw new StatusError(401);
      }

      if(!access) {
        // if the user **cann** the admin of the room, we still grant access to load the room
        // this enables, for example, editing tags even if you're not in the room
        return roomPermissionsModel(user, 'view', troupe)
          .then(function(canAccess) {
            if (canAccess) return troupe;
            throw new StatusError(403);
          });
      }

      return troupe;
    });
}

module.exports = {
  findContextForUri: findContextForUri,
  findContextForId: findContextForId
};
