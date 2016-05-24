'use strict';

var Promise = require('bluebird');
var Group = require('gitter-web-persistence').Group;
var Troupe = require('gitter-web-persistence').Troupe;
var TroupeUser = require('gitter-web-persistence').TroupeUser;
var assert = require('assert');
var validateGroupName = require('gitter-web-validators/lib/validate-group-name');
var validateGroupUri = require('gitter-web-validators/lib/validate-group-uri');
var StatusError = require('statuserror');
var legacyPolicyFactory = require('gitter-web-permissions/lib/legacy-policy-factory');
var policyFactory = require('gitter-web-permissions/lib/policy-factory');
var validateUri = require('gitter-web-github').GitHubUriValidator;
var debug = require('debug')('gitter:groups:group-service');
var mongooseUtils = require('gitter-web-persistence-utils/lib/mongoose-utils');
var groupSecurityDescriptorGenerator = require('gitter-web-permissions/lib/group-security-descriptor-generator');
var securityDescriptorService = require('gitter-web-permissions/lib/security-descriptor-service');

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

/**
 *
 */
function upsertGroup(user, options) {
  var type = options.type;
  var uri = options.uri;
  var name = options.name || uri;
  var lcUri = uri.toLowerCase();
  var githubId = options.githubId || null;

  return mongooseUtils.upsert(Group, { lcUri: lcUri }, {
      $setOnInsert: {
        name: name,
        uri: uri,
        lcUri: lcUri
      }
    })
    .spread(function(group, updateExisting) {
      debug('Upsert found existing group? %s', updateExisting);

      /** Add a security descriptor */
      if (updateExisting) return group;

      debug('Inserting a security descriptor for a new group');

      var securityDescriptor = groupSecurityDescriptorGenerator.generate(user, {
          uri: uri,
          type: type,
          githubId: githubId,
        });

      return securityDescriptorService.insertForGroup(group._id, securityDescriptor)
        .return(group);
    });
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
      var type = githubInfo.type;
      var uri = githubInfo.uri;
      var githubId = githubInfo.githubId || null;
      var security = githubInfo.security;

      return upsertGroup(user, {
        type: type,
        name: name,
        uri: uri,
        githubId: githubId,
        security: security
      });
    });
}

/**
 * @private
 */
function canAdminPotentialGitHubGroup(user, githubInfo, obtainAccessFromGitHubRepo) {
  var type = githubInfo.type;
  var uri = githubInfo.uri;
  var githubId = githubInfo.id;

  return legacyPolicyFactory.createGroupPolicyForGithubObject(user, type, uri, githubId, obtainAccessFromGitHubRepo)
    .then(function(policy) {
      return policy.canAdmin();
    });
}

/**
 * @private
 */
function canUserAdminGroup(user, group) {
  return policyFactory.createPolicyForGroupId(user, group._id)
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
        name: name,
        obtainAccessFromGitHubRepo: options.obtainAccessFromGitHubRepo
      });
    });
}

function findRoomsIdForGroup(groupId, userId) {
  // for now only public rooms plus the ones the user is in already
  return Troupe.distinct('_id', { groupId: groupId, security: 'PUBLIC' })
    .lean()
    .exec()
    .then(function(results) {
      if (!userId) return results;

      return TroupeUser.distinct("troupeId", { 'userId': userId })
        .exec()
        .then(function(roomIds) {
          // merge them in

          var roomIdMap = results.reduce(function(memo, room) {
            memo[room._id] = true;
            return memo;
          }, {});

          var filtered = roomIds.filter(function(roomId) {
            return !roomIdMap[roomId];
          });

          return results.concat(filtered);
        });
    });
}

module.exports = {
  findByUri: Promise.method(findByUri),
  findById: Promise.method(findById),
  createGroup: Promise.method(createGroup),
  findRoomsIdForGroup: Promise.method(findRoomsIdForGroup),
  migration: {
    upsertGroup: upsertGroup,
    ensureGroupForGitHubRoomCreation: ensureGroupForGitHubRoomCreation
  }
};
