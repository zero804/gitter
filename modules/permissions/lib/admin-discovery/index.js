'use strict';

var assert = require('assert');
var Promise = require('bluebird');
var githubOrgAdminDiscovery = require('./github-org');
var Group = require('gitter-web-persistence').Group;
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');
var adminGroupFinder = require('../known-external-access/admin-group-finder');

function singleOrInManyQuery(item) {
  if (Array.isArray(item)) {
    return { $in: item };
  } else {
    return item;
  }
}
function descriptorSearchAsQuery(descriptorSearch) {
  var disjunction = []
  var query = {
    $or: disjunction
  };

  if (descriptorSearch.linkPath) {
    disjunction.push({
      'sd.type': descriptorSearch.type,
      'sd.linkPath': singleOrInManyQuery(descriptorSearch.linkPath)
    });
  }

  if (descriptorSearch.externalId) {
    disjunction.push({
      'sd.type': descriptorSearch.type,
      'sd.externalId': singleOrInManyQuery(descriptorSearch.externalId)
    });
  }

  assert(disjunction.length >= 1, 'At least one disjunction should have been provided')

  return query;
}

/**
 * Find models of the supplied type for which the user
 * is a GitHub org admin
 */
function findModelsForOrgAdmin(Model, user) {
  return githubOrgAdminDiscovery(user)
    .then(function(descriptorSearch) {
      if (!descriptorSearch) return;

      var query = descriptorSearchAsQuery(descriptorSearch)
      return Model.find(query)
        .lean()
        .exec();
    });
}

/**
 * Find models of the supplied type for which the user
 * is in the extraAdmins field of the descriptor
 */
function findModelsForExtraAdmin(Model, userId) {
  return Model.find({ 'sd.extraAdmins': userId })
    .lean()
    .exec();
}

function discoverAdminGroups(user) {
  // Anonymous users don't have admin groups
  if (!user) return [];
  var userId = user._id || user.id;

  return Promise.join(
    findModelsForOrgAdmin(Group, user),
    adminGroupFinder.findAdminGroupsOfTypeForUserId('GH_REPO', userId),
    findModelsForExtraAdmin(Group, userId),
    function(orgModels, repoModels, extraAdminModels) {
      return mongoUtils.unionModelsById([orgModels, repoModels, extraAdminModels])
    });
}

module.exports = {
  discoverAdminGroups: Promise.method(discoverAdminGroups)
}
