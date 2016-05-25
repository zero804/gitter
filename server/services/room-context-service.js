'use strict';

var uriResolver          = require('./uri-resolver');
var StatusError          = require('statuserror');
var oneToOneRoomService  = require('./one-to-one-room-service');
var debug                = require('debug')('gitter:app:room-context-service');
var Promise              = require('bluebird');
var mongoUtils           = require('gitter-web-persistence-utils/lib/mongo-utils');
var policyFactory        = require('gitter-web-permissions/lib/legacy-policy-factory');

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

        if(mongoUtils.objectIDsEqual(resolvedUser.id, userId)) {
          var redirect = new StatusError(301);
          redirect.path = '/home/explore'; // TODO: is this a good idea??
          throw redirect;
        }

        debug("localUriLookup returned user for uri=%s. Finding or creating one-to-one", uri);

        return oneToOneRoomService.findOrCreateOneToOneRoom(user, resolvedUser.id)
          .spread(function(troupe, resolvedUser) {
            return policyFactory.createPolicyForRoom(user, troupe)
              .then(function(policy) {
                return {
                  troupe: troupe,
                  policy: policy,
                  roomMember: true,
                  oneToOneUser: resolvedUser,
                  uri: resolvedUser.username
                };
              });
          });
      }

      if (resolvedTroupe) {
        return policyFactory.createPolicyForRoom(user, resolvedTroupe)
          .then(function(policy) {
            return policy.canRead()
              .then(function(access) {
                if (!access) {
                  var error = new StatusError(404);

                  // TODO: move away from githubType here
                  error.githubType = resolvedTroupe.githubType;
                  error.uri = resolvedTroupe.uri;
                  throw error;
                }

                return {
                  troupe: resolvedTroupe,
                  policy: policy,
                  uri: resolvedTroupe.uri,
                  roomMember: roomMember
                };
              })
          });
      }

      // No user, no room. 404
      throw new StatusError(404);
    });

}

module.exports = {
  findContextForUri: findContextForUri
};
