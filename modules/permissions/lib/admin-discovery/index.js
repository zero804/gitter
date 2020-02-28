'use strict';

var assert = require('assert');
var Promise = require('bluebird');
const { getGithubOrgAdminDescriptor } = require('./github-org');
const { getGitLabGroupAdminDescriptor } = require('./gitlab-group');
const { getGitLabProjectAdminDescriptor } = require('./gitlab-project');
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
  var disjunction = [];
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

  assert(disjunction.length >= 1, 'At least one disjunction should have been provided');

  return query;
}

/**
 * Find models of the supplied type for which the user
 * is a GitHub org admin
 */
function findGroupsOrRoomsWhereGithubOrgAdmin(Model, user) {
  return getGithubOrgAdminDescriptor(user).then(function(descriptorSearch) {
    if (!descriptorSearch) return;

    var query = descriptorSearchAsQuery(descriptorSearch);
    return Model.find(query)
      .lean()
      .exec();
  });
}

/**
 * Find models of the supplied type for which the user
 * is a GitLab group maintainer
 */
async function findGroupsOrRoomsWhereGitlabGroupAdmin(Model, user) {
  const descriptorSearch = await getGitLabGroupAdminDescriptor(user);
  if (!descriptorSearch) return;

  const query = descriptorSearchAsQuery(descriptorSearch);
  return Model.find(query)
    .lean()
    .exec();
}

/**
 * Find models of the supplied type for which the user
 * is a GitLab group maintainer
 */
async function findGroupsOrRoomsWhereGitlabProjectAdmin(Model, user) {
  const descriptorSearch = await getGitLabProjectAdminDescriptor(user);
  if (!descriptorSearch) return;

  const query = descriptorSearchAsQuery(descriptorSearch);
  return Model.find(query)
    .lean()
    .exec();
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
    findGroupsOrRoomsWhereGitlabGroupAdmin(Group, user),
    findGroupsOrRoomsWhereGitlabProjectAdmin(Group, user),
    findGroupsOrRoomsWhereGithubOrgAdmin(Group, user),
    adminGroupFinder.findAdminGroupsOfTypeForUserId('GH_REPO', userId),
    findModelsForExtraAdmin(Group, userId),
    function(
      gitlabGroupModels,
      gitlabProjectModels,
      githubOrgModels,
      githubRepoModels,
      extraAdminModels
    ) {
      return mongoUtils.unionModelsById([
        gitlabGroupModels,
        gitlabProjectModels,
        githubOrgModels,
        githubRepoModels,
        extraAdminModels
      ]);
    }
  );
}

module.exports = {
  discoverAdminGroups: Promise.method(discoverAdminGroups)
};
