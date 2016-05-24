"use strict";

/**
 * URI lookup service is a supersimple service for managing who owns what URIs
 *
 * It is seperate from uri-service as that would create circular dependencies
 */

var persistence = require('gitter-web-persistence');
var Promise     = require('bluebird');
var mongoUtils  = require('gitter-web-persistence-utils/lib/mongo-utils');
var debug       = require('debug')('gitter:app:uri-lookup-service');


/**
 * Lookup the owner of a URI
 * @return promise of a UriLookup
 */
function lookupUri(uri) {

  var lcUri = uri.toLowerCase();

  debug('URI lookup: %s', uri);

  return persistence.UriLookup.findOne({ uri: lcUri })
    .exec()
    .then(function(uriLookup) {
      debug('URI lookup returned a result? %s', !!uriLookup);

      if(uriLookup && (uriLookup.userId || uriLookup.troupeId)) return uriLookup;

      debug('Attempting to search through users and troupes to find %s', uri);

      // Double-check the troupe and user tables to find this uri
      var repoStyle = uri.indexOf('/') >= 0;

      return Promise.all([
        repoStyle ? null : persistence.User.findOne({ username: uri }, 'username', { lean: true }).exec(),
        persistence.Troupe.findOne({ lcUri: lcUri }, 'uri', { lean: true }).exec()
      ]).spread(function(user, troupe) {
        debug('Found user? %s found troupe? %s', !!user, !!troupe);

        /* Found user. Add to cache and continue */
        if(user) {
          return persistence.UriLookup.findOneAndUpdate(
            { $or: [{ uri: lcUri }, { userId: user._id }] },
            { $set: { uri: lcUri, userId: user._id }, $unset: { troupeId: '' } },
            { upsert: true, new: true })
            .exec();
        }

        /* Found a room. Add to cache and continue */
        if(troupe) {
          return persistence.UriLookup.findOneAndUpdate(
            { $or: [{ uri: lcUri }, { troupeId: troupe._id }] },
            { $set: { uri: lcUri, troupeId: troupe._id }, $unset: { userId: '' } },
            { upsert: true, new: true })
            .exec();
        }

        /* Last ditch attempt. Look for a room that has been renamed */
        /* TODO: look for users who have been renamed too */
        return persistence.Troupe.findOne({ renamedLcUris: lcUri }, { uri: 1, lcUri: 1 }, { lean: true })
          .exec()
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
  return persistence.UriLookup.findOneAndRemove({ userId: userId })
    .exec();
}

function reserveUriForUsername(userId, username) {
  var lcUri = username.toLowerCase();
  userId = mongoUtils.asObjectID(userId);

  return persistence.UriLookup.findOneAndUpdate(
    { $or: [{ uri: lcUri }, { userId: userId }] },
    { $set: { uri: lcUri, userId: userId }, $unset: { troupeId: '' } },
    { upsert: true })
    .exec();
}

function removeBadUri(uri) {
  var lcUri = uri.toLowerCase();

  return persistence.UriLookup.remove({ uri: lcUri })
    .exec();
}

function reserveUriForTroupeId(troupeId, uri) {
  var lcUri = uri.toLowerCase();
  troupeId = mongoUtils.asObjectID(troupeId);

  return persistence.UriLookup.findOneAndUpdate(
    { $or: [{ uri: lcUri }, { troupeId: troupeId }] },
    { $set: { uri: lcUri, troupeId: troupeId }, $unset: { userId: '' } },
    { upsert: true, new: true })
    .exec();
}

exports.reserveUriForTroupeId = reserveUriForTroupeId;
exports.lookupUri = lookupUri;
exports.removeUsernameForUserId = removeUsernameForUserId;
exports.reserveUriForUsername = reserveUriForUsername;
exports.removeBadUri = removeBadUri;
