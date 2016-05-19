"use strict";

var persistence           = require('gitter-web-persistence');
var assert                = require("assert");
var mongoUtils            = require('gitter-web-persistence-utils/lib/mongo-utils');
var Promise               = require('bluebird');
var mongooseUtils         = require('gitter-web-persistence-utils/lib/mongoose-utils');
var roomMembershipService = require('./room-membership-service');

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
function findByIdLeanWithMembership(troupeId, userId) {
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
  findByIdLeanWithMembership: findByIdLeanWithMembership,
  checkGitHubTypeForUri: checkGitHubTypeForUri,
  findChildRoomsForOrg: findChildRoomsForOrg,
};
