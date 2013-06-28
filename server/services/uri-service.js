/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var userService = require('./user-service');
var troupeService = require('./troupe-service');
var Q = require('q');

function findUri(uri, callback) {
  uri = uri.toLowerCase();

  // Special case for backwards compatibility for
  // users without usernames
  if(uri.indexOf('one-one/') === 0) {
    var id = uri.split('/')[1];

    return userService.findById(id)
      .then(function(user) {
        if(user) return { user: user };

        return null;
      });
  }

  // TODO add some caching
  return Q.all([
    userService.findByUsername(uri),
    troupeService.findByUri(uri)
  ]).spread(function(user, troupe) {
    if(user) {
      return { user: user };
    }

    if(troupe) {
      return { troupe: troupe };
    }

    return null;
  }).nodeify(callback);
}

exports.findUri = findUri;

/**
 * findUri - find what the URL belongs to
 * @param  {String}   uri
 * @param  {String or ObjectId}   userId
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