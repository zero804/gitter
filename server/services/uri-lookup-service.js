/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

/**
 * URI lookup service is a supersimple service for managing who owns what URIs
 *
 * It is seperate from uri-service as that would create circular dependencies
 */

var persistence = require("./persistence-service");
var Q = require('q');
var winston = require('winston');

/**
 * Lookup the owner of a URI
 * @return promise of a UriLookup
 */
function lookupUri(uri) {
  var lcUri = uri.toLowerCase();

  winston.verbose('URI lookup: ' + uri);

  return persistence.UriLookup.findOneQ({ uri: lcUri })
    .then(function(uriLookup) {
      winston.verbose('URI lookup returned a result? ' + !!uriLookup);

      if(uriLookup) return uriLookup;

      winston.verbose('Attempting to search through users and troupes to find ' + uri);

      // Double-check the troupe and user tables to find this uri
      var repoStyle = uri.indexOf('/') >= 0;

      return Q.all([
        repoStyle ? null : persistence.User.findOneQ({ username: uri }, 'username'),
        persistence.Troupe.findOneQ({ lcUri: lcUri }, 'uri')
      ]).spread(function(user, troupe) {
        winston.verbose('Found user? ' + !!user + ' found troupe? ' + !!troupe);

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
