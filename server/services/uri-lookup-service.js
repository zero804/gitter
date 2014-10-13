/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

/**
 * URI lookup service is a supersimple service for managing who owns what URIs
 *
 * It is seperate from uri-service as that would create circular dependencies
 */

var persistence = require("./persistence-service");
var Q = require('q');
var winston = require('../utils/winston');
var mongoUtils = require('../utils/mongo-utils');
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

      if(uriLookup && (uriLookup.userId || uriLookup.troupeId )) return uriLookup;

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
            { $or: [{ uri: lcUri }, { userId: user._id }] },
            { $set: { uri: lcUri, userId: user._id }, $unset: { troupeId: '' } },
            { upsert: true });
        }

        if(troupe) {
          return persistence.UriLookup.findOneAndUpdateQ(
            { $or: [{ uri: lcUri }, { troupeId: troupe._id }] },
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

function reserveUriForUsername(userId, username) {
  var lcUri = username.toLowerCase();
  userId = mongoUtils.asObjectID(userId);

  return persistence.UriLookup.findOneAndUpdateQ(
    { $or: [{ uri: lcUri }, { userId: userId }] },
    { $set: { uri: lcUri, userId: userId }, $unset: { troupeId: '' } },
    { upsert: true });
}

function removeBadUri(uri) {
  var lcUri = uri.toLowerCase();

  return persistence.UriLookup.removeQ({ uri: lcUri });
}

function reserveUriForTroupeId(troupeId, uri) {
  var lcUri = uri.toLowerCase();
  troupeId = mongoUtils.asObjectID(troupeId);

  return persistence.UriLookup.findOneAndUpdateQ(
    { $or: [{ uri: lcUri }, { troupeId: troupeId }] },
    { $set: { uri: lcUri, troupeId: troupeId }, $unset: { userId: '' } },
    { upsert: true });
}

exports.reserveUriForTroupeId = reserveUriForTroupeId;
exports.lookupUri = lookupUri;
exports.removeUsernameForUserId = removeUsernameForUserId;
exports.reserveUriForUsername = reserveUriForUsername;
exports.removeBadUri = removeBadUri;
