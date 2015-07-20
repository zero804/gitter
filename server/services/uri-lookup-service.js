/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

/**
 * URI lookup service is a supersimple service for managing who owns what URIs
 *
 * It is seperate from uri-service as that would create circular dependencies
 */

var persistence = require("./persistence-service");
var Q           = require('q');
var mongoUtils  = require('../utils/mongo-utils');
var debug       = require('debug')('gitter:uri-lookup-service');


/**
 * Lookup the owner of a URI
 * @return promise of a UriLookup
 */
function lookupUri(uri) {

  var lcUri = uri.toLowerCase();

  debug('URI lookup: %s', uri);

  return persistence.UriLookup.findOneQ({ uri: lcUri })
    .then(function(uriLookup) {
      debug('URI lookup returned a result? %s', !!uriLookup);

      if(uriLookup && (uriLookup.userId || uriLookup.troupeId )) return uriLookup;

      debug('Attempting to search through users and troupes to find %s', uri);

      // Double-check the troupe and user tables to find this uri
      var repoStyle = uri.indexOf('/') >= 0;

      return Q.all([
        repoStyle ? null : persistence.User.findOneQ({ username: uri }, 'username', { lean: true }),
        persistence.Troupe.findOneQ({ lcUri: lcUri }, 'uri', { lean: true })
      ]).spread(function(user, troupe) {
        debug('Found user? %s found troupe? %s', !!user, !!troupe);

        /* Found user. Add to cache and continue */
        if(user) {
          return persistence.UriLookup.findOneAndUpdateQ(
            { $or: [{ uri: lcUri }, { userId: user._id }] },
            { $set: { uri: lcUri, userId: user._id }, $unset: { troupeId: '' } },
            { upsert: true, new: true });
        }

        /* Found a room. Add to cache and continue */
        if(troupe) {
          return persistence.UriLookup.findOneAndUpdateQ(
            { $or: [{ uri: lcUri }, { troupeId: troupe._id }] },
            { $set: { uri: lcUri, troupeId: troupe._id }, $unset: { userId: '' } },
            { upsert: true, new: true });
        }

        /* Last ditch attempt. Look for a room that has been renamed */
        /* TODO: look for users who have been renamed too */
        return persistence.Troupe.findOneQ({ renamedLcUris: lcUri }, { uri: 1, lcUri: 1 }, { lean: true })
          .then(function(renamedTroupe) {
            if (!renamedTroupe) return null;
            debug('Room %s has been renamed to %s', lcUri, renamedTroupe.lcUri);

            /* Don't save this lookup */
            return { uri: renamedTroupe.lcUri, troupeId: renamedTroupe._id };
          });
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
    { upsert: true, new: true });
}

exports.reserveUriForTroupeId = reserveUriForTroupeId;
exports.lookupUri = lookupUri;
exports.removeUsernameForUserId = removeUsernameForUserId;
exports.reserveUriForUsername = reserveUriForUsername;
exports.removeBadUri = removeBadUri;
