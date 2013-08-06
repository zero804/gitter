/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var userService = require('./user-service');
var troupeService = require('./troupe-service');
var uriLookupService = require("./uri-lookup-service");
var promiseUtils = require("../utils/promise-utils");

/**
 * Finds who owns a URI
 * @return promise of one of:
 *   { troupe: troupe }
 *   or { user: user }
 *   or null if the uri doesn't exist
 */
function findUri(uri, callback) {
  uri = uri.toLowerCase();
  if(uri.charAt(0) === '/') {
    uri = uri.substring(1);
  }

  // Special case for backwards compatibility for
  // users without usernames
  if(uri.indexOf('one-one/') === 0) {
    var userId = uri.split('/')[1];
    return userService.findById(userId)
      .then(function(user) {
        if(user) return { user: user };

        return null;
      });
  }

  return uriLookupService.lookupUri(uri)
    .then(promiseUtils.required)
    .then(function(uriLookup) {
      if(uriLookup.userId) {
        return userService.findById(uriLookup.userId)
          .then(function(user) {
            if(user) return { user: user };
          });
      }

      if(uriLookup.troupeId) {
        return troupeService.findById(uriLookup.troupeId)
          .then(function(troupe) {
            if(troupe) return { troupe: troupe };
          });
      }

      return null;
    })
    .nodeify(callback);
}

exports.findUri = findUri;

/**
 * findUri - find what the URL belongs to
 * @param  {String}   uri
 * @param  {String or ObjectId}   userId can be null
 * @param  {Function} callback
 * @return {promise}  one of the following values:
 *  { ownUrl: true },
 *  { oneToOne: true, troupe: x, otherUser: y, invite: invite  },
 *  { troupe: troupe, group: true, access: true/false, invite: invite },
 *  { notFound: true }
 */
exports.findUriForUser = function(uri, userId, callback) {
  return findUri(uri)
      .then(function(result) {
        if(!result) {
          return { notFound: true };
        }

        var user = result.user;
        var troupe = result.troupe;

        if(user) {
          if(!userId) {
            return { oneToOne: true, troupe: null, otherUser: user, access: false, invite: null };
          }

          // Is this the users own site?
          if(user.id == userId) {
            return { ownUrl: true };
          }

          return troupeService.findOrCreateOneToOneTroupe(userId, user.id)
            .spread(function(troupe, otherUser, invite) {
              return { oneToOne: true, troupe: troupe, otherUser: otherUser, access: !!troupe, invite: invite };

            });
        }

        if(troupe) {
          if(!userId) {
            return { troupe: troupe, group: true, access: false };
          }

          if(troupeService.userIdHasAccessToTroupe(userId, troupe)) {
            return { troupe: troupe, group: true, access: true };
          }

          return troupeService.findUnusedInviteToTroupeForUserId(userId, troupe.id)
            .then(function(invite) {
              return { troupe: troupe, group: true, access: false, invite: invite };
            });
        }

        throw new Error('Result did not contain user or troupe attributes.');
      })
      .nodeify(callback);

};