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
var promiseUtils = require('../utils/promise-utils');

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

  if(oldUsername == newUsername) return; // Nothing to do
  if(oldUsername) {
    if(newUsername) {
      // Update an existing URI entry
      return persistence.UriLookup.findOneAndUpdateQ(
          { userId: userId },
          { $set: { uri: newUsername, userId: userId }, $unset: { troupeId: '' } },
          { upsert: true })
        .then(promiseUtils.required);
    } else {
      // Remove an existing URI entry
      return persistence.UriLookup.findOneAndRemoveQ({ userId: userId })
        .then(promiseUtils.required);
    }

    // TODO: in future, deal with the possiblity of corrupt data
  }

  return persistence.UriLookup.createQ({ uri: newUsername, userId: userId });
}

/**
 * Remove the username for a user
 * @return promise of nothing
 */
function removeUsernameForUserId(userId, oldUsername) {
  return updateUsernameForUserId(userId, oldUsername, null);
}

function reserveUriForTroupeId(troupeId, uri) {
  return persistence.UriLookup.createQ({ uri: uri, troupeId: troupeId });
}

function removeUriForTroupeId(troupeId) {
  return persistence.UriLookup.findOneAndRemoveQ({ troupeId: troupeId });
}

exports.lookupUri = lookupUri;
exports.updateUsernameForUserId = updateUsernameForUserId;
exports.removeUsernameForUserId = removeUsernameForUserId;
exports.reserveUriForTroupeId = reserveUriForTroupeId;
exports.removeUriForTroupeId = removeUriForTroupeId;
