/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var persistence = require('./persistence-service');
var validateUri = require('./github/github-uri-validator');
var uriLookupService = require("./uri-lookup-service");
var assert = require("assert");
var winston = require("winston");
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
            if(!user) return uriLookupService.removeBadUri(uri)
                                .thenResolve(null);

            if(user.username != uri && user.username.toLowerCase() === uri.toLowerCase()) throw { redirect: '/' + user.username };

            return { user: user };
          });
      }

      if(uriLookup.troupeId) {
        return troupeService.findById(uriLookup.troupeId)
          .then(function(troupe) {
            if(!troupe) return uriLookupService.removeBadUri(uri)
                                .thenResolve(null);

            if(troupe.uri != uri && troupe.uri.toLowerCase() === uri.toLowerCase()) throw { redirect: '/' + troupe.uri };
            return { troupe: troupe };
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
    winston.verbose('Does user ' + user && user.username + ' have access to ' + uri + '?');

    return Q.all([
        troupe,
        permissionsModel(user, 'join', uri, troupe.githubType)
      ]);
  }

  var lcUri = uri.toLowerCase();

  winston.verbose('Attempting to validate URI ' + uri + ' on Github');

  /* From here on we're going to be doing a create */
  return validateUri(user, uri)
    .spread(function(githubType, officialUri) {
      winston.verbose('URI validation ' + uri + ' returned ', { type: githubType, uri: officialUri });

      /* If we can't determine the type, skip it */
      if(!githubType) return [null, false];

      if(officialUri != uri && officialUri.toLowerCase() === uri.toLowerCase()) throw { redirect: '/' + officialUri };

      winston.verbose('Checking if user has permission to create a room at ' + uri);

      /* Room does not yet exist */
      return permissionsModel(user, 'create', uri, githubType)
        .then(function(access) {
          if(!access) return [null, access];

          return persistence.Troupe.findOneAndUpdateQ(
            { lcUri: lcUri, githubType: githubType },
            {
              $setOnInsert: {
                lcUri: lcUri,
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
      winston.verbose('URI Lookup returned ', { uri: uri, isUser: !!(uriLookup && uriLookup.user), isTroupe: !!(uriLookup && uriLookup.troupe) });

      /* Lookup found a user? */
      if(uriLookup && uriLookup.user) {
        var otherUser = uriLookup.user;

        if(otherUser.id == userId) {
          winston.verbose('URI Lookup is our own');

          return { ownUrl: true };
        }

        winston.verbose('Finding or creating a one to one chat');

        return troupeService.findOrCreateOneToOneTroupeIfPossible(userId, otherUser.id)
          .spread(function(troupe, otherUser) {
            return { oneToOne: true, troupe: troupe, otherUser: otherUser };
          });
      }

      winston.verbose('Attempting to access room ' + uri);

      /* Didn't find a user, but we may have found another room */
      return findOrCreateNonOneToOneRoom(user, uriLookup && uriLookup.troupe, uri)
        .spread(function(troupe, access) {
          return ensureAccessControl(user, troupe, access);
        })
        .then(function(troupe) {
          return { oneToOne: false, troupe: troupe };
        });
    });
}

exports.findOrCreateRoom = findOrCreateRoom;
