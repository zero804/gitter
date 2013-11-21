/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var userService = require('./user-service');
var troupeService = require('./troupe-service');
var inviteService = require('./invite-service');
var uriLookupService = require("./uri-lookup-service");
var GitHubOrgService = require("./github/github-org-service");
var roomService = require("./room-service");
var assert = require("assert");

/**
 * Finds who owns a URI
 * @return promise of one of:
 *   { troupe: troupe }
 *   or { user: user }
 *   or null if the uri doesn't exist
 */
function findUri(currentUser, uri, callback) {
  assert(currentUser, 'currentUser required');
  assert(uri, 'uri required');

  uri = uri.toLowerCase();
  if(uri.charAt(0) === '/') {
    uri = uri.substring(1);
  }

  var userId = currentUser && currentUser.id;

  return uriLookupService.lookupUri(uri)
    .then(function(uriLookup) {
      if(!uriLookup) return null;

      if(uriLookup.userId) {
        return userService.findById(uriLookup.userId)
          .then(function(user) {
            if(user) return { user: user };
          });
      }

      if(uriLookup.troupeId) {
        return troupeService.findById(uriLookup.troupeId)
          .then(function(troupe) {
            if(!troupe) return null;

            // TODO: some troupes will be open.. deal with that
            if(troupe.containsUserId(userId)) {

            }

            if(troupe) return { troupe: troupe };
          });
      }

      return null;
    })
    .then(function(uriLookup) {
      if(uriLookup) return uriLookup;

      /**
       * We still don't know what this uri represents
       * Ask github about this endpoint
       */
      var parts = uri.split('/');
      var userOrOrg = parts[0];
      if(parts.length === 1) {
        return findGitHubOrg(currentUser, userOrOrg)
          .then(function(userInOrg) {
            if(userInOrg) {
              return roomService.findOrCreateRoom({ uri: userOrOrg, githubType: 'ORG', user: currentUser })
                .then(function(troupe) {
                  return { troupe: troupe };
                });
            }

            return null;
          });
      }


    })
    .nodeify(callback);
}

function findGitHubOrg(currentUser, userOrOrg) {
  var orgService = new GitHubOrgService(currentUser);
  return orgService.member(userOrOrg, currentUser.username);
}

exports.findUri = findUri;

function handleUserUri(currentUser, user) {
  var userId = currentUser && currentUser.id;

  if(!userId) {
    return { oneToOne: true, troupe: null, otherUser: user, access: false, invite: null };
  }

  // Is this the users own site?
  if(user.id == userId) {
    return { ownUrl: true };
  }

  return troupeService.findOrCreateOneToOneTroupeIfPossible(userId, user.id)
    .spread(function(troupe, otherUser, invite) {
      return { oneToOne: true, troupe: troupe, otherUser: otherUser, access: !!troupe, invite: invite };

    });
}

function handleTroupeUri(currentUser, troupe) {
  var userId = currentUser && currentUser.id;

  if(!userId) {
    return { troupe: troupe, group: true, access: false };
  }

  return roomService.isUserAllowedInRoom(currentUser, troupe)
    .then(function(hasAccess) {
      return { troupe: troupe, group: true, access: hasAccess };

      // if(troupeService.userIdHasAccessToTroupe(userId, troupe)) {
      // }

      // return inviteService.findUnusedInviteToTroupeForUserId(userId, troupe.id)
      //   .then(function(invite) {
      //     return { troupe: troupe, group: true, access: false, invite: invite };
      //   });

    });

}

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
exports.findUriForUser = function(currentUser, uri, callback) {
  assert(currentUser, 'currentUser required');
  assert(uri, 'uri required');

  return findUri(currentUser, uri)
      .then(function(result) {
        if(!result) {
          return { notFound: true };
        }

        if(result.user) return handleUserUri(currentUser, result.user);
        if(result.troupe) return handleTroupeUri(currentUser, result.troupe);

        throw new Error('Result did not contain user or troupe attributes.');
      })
      .nodeify(callback);

};