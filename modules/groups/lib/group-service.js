'use strict';

var Promise = require('bluebird');
var Group = require('gitter-web-persistence').Group;
var assert = require('assert');
var validateGroupName = require('gitter-web-validators/lib/validate-group-name');
var validateGroupUri = require('gitter-web-validators/lib/validate-group-uri');
var StatusError = require('statuserror');
var policyFactory = require('gitter-web-permissions/lib/legacy-policy-factory');
var validateUri = require('gitter-web-github').GitHubUriValidator;
var debug = require('debug')('gitter:groups:group-service');

/**
 * Find a group given an id
 */
function findById(groupId) {
  return Group.findById(groupId)
    .lean()
    .exec();
}

/**
 * Find a group given a URI
 */
function findByUri(uri) {
  assert(uri, 'uri required');
  return Group.findOne({ lcUri: uri.toLowerCase() })
    .lean()
    .exec();
}

function createGroup(user, options) {
  var name = options.name;
  var uri = options.uri;
  assert(user, 'user required');
  assert(name, 'name required');
  assert(uri, 'name required');

  if(!validateGroupName(name)) {
    throw new StatusError(400, 'Invalid group name');
  }

  if(!validateGroupUri(uri)) {
    throw new StatusError(400, 'Invalid group uri');
  }

  /* From here on we're going to be doing a create */
  return validateUri(user, uri)
    .bind({
      githubInfo: null,
    })
    .then(function(githubInfo) {
      debug("GitHub information for %s is %j", uri, githubInfo);

      if (!githubInfo) throw new StatusError(404);
      this.githubInfo = githubInfo;

      return canAdminPotentialGitHubGroup(user, githubInfo, options.obtainAccessFromGitHubRepo);
    })
    .then(function(isAdmin) {
      if (!isAdmin) throw new StatusError(403, 'Not an administrator of this org');

      var githubInfo = this.githubInfo;
      var githubType = githubInfo.type;
      var officialUri = githubInfo.uri;
      var lcUri = officialUri.toLowerCase();
      var githubId = githubInfo.githubId || null;

      var group = new Group({
        name: name,
        uri: uri,
        lcUri: lcUri,
        type: githubType,
        githubId: githubId,
      });

      return group.save();
    });
}

/**
 * @private
 */
function canAdminPotentialGitHubGroup(user, githubInfo, obtainAccessFromGitHubRepo) {
  // FIXME: This is pretty dodgy.
  // https://github.com/troupe/gitter-webapp/issues/1519
  var group = {
    _id: -1,
    uri: githubInfo.uri,
    lcUri: githubInfo.uri.toLowerCase(),
    type: githubInfo.type,
    githubId: githubInfo.id,
  }

  return policyFactory.createPolicyForGroup(user, group, obtainAccessFromGitHubRepo)
    .then(function(policy) {
      return policy.canAdmin();
    });
}

/**
 * @private
 */
function canUserAdminGroup(user, group, obtainAccessFromGitHubRepo) {
  return policyFactory.createPolicyForGroup(user, group, obtainAccessFromGitHubRepo)
    .then(function(policy) {
      return policy.canAdmin();
    });
}

/**
 * During the migration only
 *
 * Ensures that a group exists
 */
function ensureGroupForGitHubRoomCreation(user, options) {
  var uri = options.uri;
  var name = options.name || uri;
  assert(user, 'user required');
  assert(uri, 'name required');

  return findByUri(uri)
    .then(function(existingGroup) {
      debug('Existing group found');

      if (existingGroup) {
        return canUserAdminGroup(user, existingGroup)
          .then(function(adminAccess) {
            debug('Has admin access? %s', adminAccess);

            if (!adminAccess) throw new StatusError(403, 'Cannot create a room under ' + uri);
            return existingGroup;
          });
      }

      debug('No existing group. Will create');
      return createGroup(user, {
        uri: uri,
        name: name
      });
    });
}

module.exports = {
  findByUri: Promise.method(findByUri),
  findById: Promise.method(findById),
  createGroup: Promise.method(createGroup),
  migration: {
    ensureGroupForGitHubRoomCreation: ensureGroupForGitHubRoomCreation
  }
};
