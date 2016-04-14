"use strict";

var _                     = require('lodash');
var persistence           = require('./persistence-service');
var assert                = require("assert");
var mongoUtils            = require("../utils/mongo-utils");
var Promise               = require('bluebird');
var assert                = require('assert');
var roomPermissionsModel  = require('./room-permissions-model');
var mongooseUtils         = require('../utils/mongoose-utils');
var StatusError           = require('statuserror');
var roomMembershipService = require('./room-membership-service');
var getMaxTagLength       = require('gitter-web-shared/validation/validate-tag').getMaxTagLength;

var MAX_RAW_TAGS_LENGTH = 200;

function findByUri(uri, callback) {
  var lcUri = uri.toLowerCase();

  return persistence.Troupe.findOne({ lcUri: lcUri })
    .exec()
    .nodeify(callback);
}

function findByIds(ids, callback) {
  return mongooseUtils.findByIds(persistence.Troupe, ids, callback);
}

function findByIdsLean(ids, select) {
  return mongooseUtils.findByIdsLean(persistence.Troupe, ids, select);
}

function findById(id, callback) {
  assert(mongoUtils.isLikeObjectId(id));

  return persistence.Troupe.findById(id)
    .exec()
    .nodeify(callback);
}

function checkIdExists(id) {
  return persistence.Troupe.findById(id)
    .count()
    .exec()
    .then(function(count) {
      return count > 0;
    });

}

/**
 * [{troupe without users}, userIsInRoom:boolean]
 */
function findByIdLeanWithAccess(troupeId, userId) {
  troupeId = mongoUtils.asObjectID(troupeId);
  if (userId) {
    return Promise.join(
      persistence.Troupe.findOne({ _id: troupeId }, { }, { lean: true }).exec(),
      roomMembershipService.checkRoomMembership(troupeId, userId),
      function(leanTroupe, access) {
        if (!leanTroupe) return [null, false];
        leanTroupe.id = mongoUtils.serializeObjectId(leanTroupe._id);
        return [leanTroupe, access];
      });
  }

  // Query without userId
  return persistence.Troupe.findOne({ _id: troupeId }, { }, { lean: true })
    .exec()
    .then(function(result) {
      if (!result) return [null, false];
      result.id = mongoUtils.serializeObjectId(result._id);
      return [result, false];
    });
}

/**
 * Returns true if the GitHub type for the uri matches
 * the provided github type
 */
function checkGitHubTypeForUri(uri, githubType) {
  var lcUri = uri.toLowerCase();

  return persistence.Troupe.count({ lcUri: lcUri, githubType: githubType })
    .exec()
    .then(function(count) {
      return !!count;
    });
}

function updateTopic(user, troupe, topic) {
  /* First check whether the user has permission to work the topic */
  return roomPermissionsModel(user, 'admin', troupe)
    .then(function(access) {
      if(!access) throw new StatusError(403); /* Forbidden */

      troupe.topic = topic;

      return troupe.save()
        .then(function() {
          return troupe;
        });
    });
}

function toggleSearchIndexing(user, troupe, bool) {
  return roomPermissionsModel(user, 'admin', troupe)
    .then(function(access) {
      if(!access) throw new StatusError(403); /* Forbidden */

      troupe.noindex = bool;

      return troupe.save()
        .then(function() {
          return troupe;
        });
    });
}

function updateProviders(user, room, providers) {
  var isStaff = user.get('staff');

  return (isStaff ? Promise.resolve(true) : roomPermissionsModel(user, 'admin', room))
    .then(function(access) {
      if (!access) throw new StatusError(403); /* Forbidden */

      // strictly validate the list of providers
      var filtered = _.uniq(providers.filter(function(provider) {
        // only github is allowed for now
        return (provider == 'github');
      }));

      if (filtered.length) {
        room.providers = filtered;
      } else {
        room.providers = undefined;
      }

      return room.save()
        .then(function() {
          return room;
        });
    });
}

function updateTags(user, room, tags) {
  var reservedTagTestRegex = (/:/);
  var isStaff = user.get('staff');

  return (isStaff ? Promise.resolve(true) : roomPermissionsModel(user, 'admin', room))
    .then(function(access) {
      if(!access) throw new StatusError(403); /* Forbidden */

      var cleanTags = tags.trim().slice(0, MAX_RAW_TAGS_LENGTH).split(',')
        .filter(function(tag) {
          return !!tag; //
        })
        .map(function(tag) {
          return tag.trim().slice(0, getMaxTagLength(isStaff));
        })
        .filter(function(tag) {
          // staff can do anything
          if(isStaff) {
            return true;
          }
          // Users can only save, non-reserved tags
          if(!reservedTagTestRegex.test(tag)) {
            return true;
          }

          return false;
        });

      // Make sure a normal user doesn't clear out our already existing reserved-word(with colons) tags
      var reservedTags = [];
      if(!isStaff) {
        reservedTags = room.tags
          .filter(function(tag) {
            return reservedTagTestRegex.test(tag);
          });
      }

      room.tags = [].concat(cleanTags, reservedTags);

      return room.save()
        .then(function() {
          return room;
        });
    });
}


function findChildRoomsForOrg(org, opts) {
  if (!org) return Promise.resolve([]);
  opts = opts || {};

  var query = { lcOwner: org.toLowerCase() };
  if (opts.security) query.security = opts.security;

  return persistence.Troupe.find(query)
    .sort({ userCount: 'desc' })
    .exec();
}


module.exports = {
  findByUri: findByUri,
  findById: findById,
  checkIdExists: checkIdExists,
  findByIds: findByIds,
  findByIdsLean: findByIdsLean,
  findByIdLeanWithAccess: findByIdLeanWithAccess,
  updateTopic: updateTopic,
  toggleSearchIndexing: toggleSearchIndexing,
  checkGitHubTypeForUri: checkGitHubTypeForUri,
  findChildRoomsForOrg: findChildRoomsForOrg,
  updateProviders: updateProviders,
  updateTags: updateTags
};
