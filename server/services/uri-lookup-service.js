/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

/**
 * URI lookup service is a supersimple service for managing who owns what URIs
 *
 * It is seperate from uri-service as that would create circular dependencies
 */

var persistence = require("./persistence-service");
var assert = require('assert');
var Q = require('q');
var _ = require('underscore');
var collections = require('../utils/collections');

/**
 * Lookup the owner of a URI
 * @return promise of a UriLookup
 */
function lookupUri(uri) {
  uri = uri.toLowerCase();

  return persistence.UriLookup.findOneQ({ uri: uri })
    .then(function(uriLookup) {
      if(uriLookup) return uriLookup;

      // Double-check the troupe and user tables to find this uri

      return Q.all([
        persistence.User.findOneQ({ username: uri }, 'username'),
        persistence.Troupe.findOneQ({ uri: uri }, 'uri')
      ]).spread(function(user, troupe) {
        if(user) {
          return persistence.UriLookup.findOneAndUpdateQ(
            { uri: uri, userId: user._id },
            { $set: { uri: uri, userId: user._id }, $unset: { troupeId: '' } },
            { upsert: true });
        }

        if(troupe) {
          return persistence.UriLookup.findOneAndUpdateQ(
            { uri: uri, troupeId: troupe._id },
            { $set: { uri: uri, troupeId: troupe._id }, $unset: { userId: '' } },
             { upsert: true });
        }

        return null;
    });
  });
}

/**
 * Update the username for a user
 * @return promise of UriLookup
 */
function updateUsernameForUserId(userId, oldUsername, newUsername) {
  assert(userId,'UserId parameter expected');

  var op;

  if(newUsername) {
    // Update an existing URI entry
    op = persistence.UriLookup.findOneAndUpdateQ(
        { userId: userId },
        { $set: { uri: newUsername, userId: userId }, $unset: { troupeId: '' } },
        { upsert: true });
  } else {
    // Remove an existing URI entry
    op = persistence.UriLookup.findOneAndRemoveQ({ userId: userId });
  }

  return op.fail(function(err) {
      if(err.name === 'MongoError' && err.lastErrorObject && err.lastErrorObject.code === 11000) {
        throw 409; // CONFLICT - uri already used
      }

      throw err;
    });
}

/**
 * Remove the username for a user
 * @return promise of nothing
 */
function removeUsernameForUserId(userId) {
  return persistence.UriLookup.findOneAndRemoveQ({ userId: userId });
}

function reserveUriForTroupeId(troupeId, uri) {
  return persistence.UriLookup.findOneAndUpdateQ(
          { troupeId: troupeId },
          { $set: { uri: uri, troupeId: troupeId }, $unset: { userId: '' } },
          { upsert: true });
}

function removeUriForTroupeId(troupeId) {
  return persistence.UriLookup.findOneAndRemoveQ({ troupeId: troupeId });
}

/**
 * Given a bunch of potential uris find those that have been taken
 * @return promise of a hash of taken uris: { uri1: true, uri2: true }
 */
function findTakenUris(uris) {
  uris = collections.idsIn(uris);

  var taken = {};

  return persistence.UriLookup.findQ({ uri: { $in: uris } }, 'uri')
    .then(function(takenUriLookups) {

      takenUriLookups.forEach(function(uriLookup) {
        taken[uriLookup.uri] = true; // Mark as taken
      });

    })
    .then(function() {
      var stillAvailable = _.difference(uris, Object.keys(taken));

      if(!stillAvailable.length) return;

      return Q.all([
        persistence.User.findQ({ username: { $in: stillAvailable } }, 'username'),
        persistence.Troupe.findQ({ uri: { $in: stillAvailable } }, 'uri')
      ]).spread(function(users, troupes) {

        users.forEach(function(user) {
          taken[user.username] = true; // Mark as taken
        });

        troupes.forEach(function(troupe) {
          taken[troupe.uri] = true; // Mark as taken
        });

      });
    })
    .thenResolve(taken);
}

exports.lookupUri = lookupUri;
exports.updateUsernameForUserId = updateUsernameForUserId;
exports.removeUsernameForUserId = removeUsernameForUserId;
exports.reserveUriForTroupeId = reserveUriForTroupeId;
exports.removeUriForTroupeId = removeUriForTroupeId;
exports.findTakenUris = findTakenUris;