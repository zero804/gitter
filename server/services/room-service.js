/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var persistence = require('./persistence-service');
var validateUri = require('./github/github-uri-validator');
var uriLookupService = require("./uri-lookup-service");
var assert = require("assert");
var ObjectID = require('mongodb').ObjectID;
var Q = require('q');
var permissionsModel = require('./permissions-model');
var userService = require('./user-service');
var troupeService = require('./troupe-service');

function localUriLookup(uri) {
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

            if(troupe) return { troupe: troupe };
          });
      }

      return null;
    });
}

/**
 * Assuming that oneToOne uris have been handled already,
 * Figure out what this troupe is for
 *
 * @returns Promise of a troupe if the user is able to join/create the troupe
 */
function findOrCreateNonOneToOneRoom(user, troupe, uri) {
  if(troupe) {
    return Q.all([
        troupe,
        permissionsModel(user, 'join', uri, troupe.githubType)
      ]);
  }

  return validateUri(user, uri)
    .then(function(githubType) {
      /* If we can't determine the type, skip it */
      if(!githubType) return [null, false];

      /* Room does not yet exist */
      return permissionsModel(user, 'create', uri, githubType)
        .then(function(access) {
          if(!access) return [null, access];

          return persistence.Troupe.findOneAndUpdateQ(
            { uri: uri, githubType: githubType },
            {
              $setOnInsert: {
                uri: uri,
                githubType: githubType,
                users:  user ? [{ _id: new ObjectID(), userId: user._id }] : []
              }
            },
            {
              upsert: true
            })
            .then(function(troupe) {
              return [troupe, true];
            });
        });
    });
}

/**
 * Grant or remove the users access to a room
 */
function ensureAccessControl(user, troupe, access) {
  if(troupe) {
    if(access) {
      /* In troupe? */
      if(troupe.containsUserId(user.id)) return troupe;

      troupe.addUserById(user.id);
      return troupe.saveQ().thenResolve(troupe);
    } else {
      /* No access */
      if(!troupe.containsUserId(user.id)) return null;

      troupe.removeUserById(user.id);
      return troupe.saveQ().thenResolve(null);
    }
  }
}

/**
 * Add a user to a room.
 * - If the room does not exist, will create the room if the user has permission
 * - If the room does exist, will add the user to the room if the user has permission
 * - If the user does not have access, will return null
 *
 * @return The promise of a troupe or nothing.
 */
function findOrCreateRoom(user, uri) {
  assert(uri, 'uri required');
  var userId = user.id;

  /* First off, try use local data to figure out what this url is for */
  return localUriLookup(uri)
    .then(function(uriLookup) {

      /* Lookup found a user? */
      if(uriLookup && uriLookup.user) {
        var otherUserId = uriLookup.user;

        return troupeService.findOrCreateOneToOneTroupeIfPossible(userId, otherUserId.id)
          .spread(function(troupe, otherUser) {
            return { oneToOne: true, troupe: troupe, otherUser: otherUser };
          });
      }


      /* Didn't find a user, but we may have found another room */
      return findOrCreateNonOneToOneRoom(user, uriLookup && uriLookup.troupe , uri)
        .spread(function(troupe, access) {
          return ensureAccessControl(user, troupe, access);
        })
        .then(function(troupe) {
          return { oneToOne: false, troupe: troupe };
        });
    });
}

exports.findOrCreateRoom = findOrCreateRoom;
