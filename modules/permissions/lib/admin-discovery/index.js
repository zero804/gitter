'use strict';

var Promise = require('bluebird');
var githubOrgAdminDiscovery = require('./github-org');
var Group = require('gitter-web-persistence').Group;

function descriptorSearchAsQuery(descriptorSearch) {
  var query = {
    'sd.type': descriptorSearch.type,
  };

  if (descriptorSearch.linkPath) {
    if (Array.isArray(descriptorSearch.linkPath)) {
      query['sd.linkPath'] = { $in: descriptorSearch.linkPath };
    } else {
      query['sd.linkPath'] = descriptorSearch.linkPath;
    }
  }

  // More query search things here in future?

  return query;
}

/**
 * Find models of the supplied type for which the user
 * is a GitHub org admin
 */
function findModelsForOrgAdmin(Model, user) {
  // TODO: check that the user is GitHub user
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

/**
 * Given an array of an array of models, return a
 * unique list of models
 */
function uniqueModels(arrayOfModels) {
  var idHash = {};
  var result = [];
  arrayOfModels.forEach(function(models) {
    if (!models) return;

    models.forEach(function(model) {
      var id = model._id;
      if (idHash[id]) return;
      idHash[id] = true;
      result.push(model);
    });
  });

  return result;
}

function discoverAdminGroups(user) {
  // Anonymous users don't have admin groups
  if (!user) return [];

  return Promise.join(
    findModelsForOrgAdmin(Group, user),
    // findRepoModels would go here, but will not be implemented for now
    // as it could result in too large a query (50k repos for example)
    findModelsForExtraAdmin(Group, user._id || user.id),
    function(orgModels, extraAdminModels) {
      return uniqueModels([orgModels, extraAdminModels])
    });
}

module.exports = {
  discoverAdminGroups: Promise.method(discoverAdminGroups)
}
