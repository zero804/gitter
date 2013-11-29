/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

/**
 * URI lookup service is a supersimple service for managing who owns what URIs
 *
 * It is seperate from uri-service as that would create circular dependencies
 */

var persistence = require("./persistence-service");
var Q = require('q');
var _ = require('underscore');
var collections = require('../utils/collections');

/**
 * Lookup the owner of a URI
 * @return promise of a UriLookup
 */
function lookupUri(uri) {
  var lcUri = uri.toLowerCase();

  return persistence.UriLookup.findOneQ({ uri: lcUri })
    .then(function(uriLookup) {
      if(uriLookup) return uriLookup;

      // Double-check the troupe and user tables to find this uri
      var repoStyle = uri.indexOf('/') >= 0;

      return Q.all([
        repoStyle ? null : persistence.User.findOneQ({ username: uri }, 'username'),
        persistence.Troupe.findOneQ({ lcUri: lcUri }, 'uri')
      ]).spread(function(user, troupe) {

        if(user) {
          return persistence.UriLookup.findOneAndUpdateQ(
            { uri: uri, userId: user._id },
            { $set: { uri: lcUri, userId: user._id }, $unset: { troupeId: '' } },
            { upsert: true });
        }

        if(troupe) {
          return persistence.UriLookup.findOneAndUpdateQ(
            { uri: uri, troupeId: troupe._id },
            { $set: { uri: lcUri, troupeId: troupe._id }, $unset: { userId: '' } },
            { upsert: true });
        }

        return null;
      });
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

function removeBadUri(uri) {
  var lcUri = uri.toLowerCase();

  return persistence.UriLookup.removeQ({ uri: lcUri });
}

exports.lookupUri = lookupUri;
exports.removeUsernameForUserId = removeUsernameForUserId;
exports.reserveUriForTroupeId = reserveUriForTroupeId;
exports.removeUriForTroupeId = removeUriForTroupeId;
exports.removeBadUri = removeBadUri;
