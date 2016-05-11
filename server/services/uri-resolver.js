'use strict';

var env                = require('gitter-web-env');
var logger             = env.logger;

var uriLookupService   = require("./uri-lookup-service");
var userService        = require('./user-service');
var troupeService      = require('./troupe-service');
var debug              = require('debug')('gitter:uri-resolver');
var StatusError        = require('statuserror');

/**
 * Returns [user, troupe, roomMember] where either user XOR troupe and access is set
 * if the uri resolved to a troupe (not a user)
 */
module.exports = function uriResolver(userId, uri, options) {
  debug("uriResolver %s", uri);
  var ignoreCase = options && options.ignoreCase;

  return uriLookupService.lookupUri(uri)
    .then(function (uriLookup) {
      if (!uriLookup) return [];

      if(uriLookup.userId) {
        /* One to one */
        return userService.findById(uriLookup.userId)
          .then(function(user) {
            if(!user) {
              logger.info('Removing stale uri: ' + uri + ' from URI lookups');

              return uriLookupService.removeBadUri(uri)
                .then(function() {
                  return [];
                });
            }

            if(!ignoreCase &&
                user.username !== uri &&
                user.username.toLowerCase() === uri.toLowerCase()) {
              logger.info('Incorrect case for room: ' + uri + ' redirecting to ' + user.username);
              var redirect = new StatusError(301);
              redirect.path = '/' + user.username;
              throw redirect;
            }

            return [user, null];
          });
      }

      if(uriLookup.troupeId) {
        return troupeService.findByIdLeanWithMembership(uriLookup.troupeId, userId)
          .spread(function(troupe, roomMember) {
            if(!troupe) {
              logger.info('Removing stale uri: ' + uri + ' from URI lookups');

              return uriLookupService.removeBadUri(uri)
                .then(function() {
                  return [];
                });
            }

            // The room is an exact match
            if (troupe.uri === uri) {
              return [null, troupe, roomMember];
            }

            // The room resolves, but differs from the requested uri
            if(troupe.uri.toLowerCase() === uri.toLowerCase() && ignoreCase) {
              /* Only the case is wrong and we're ignore case differences.... */
              logger.info('Incorrect case for room: ' + uri + ' redirecting to ' + troupe.uri);
              return [null, troupe, roomMember];
            }

            var redirect = new StatusError(301);
            redirect.path = '/' + troupe.uri;
            throw redirect;
          });
      }

      throw new StatusError(404);
    });
};
