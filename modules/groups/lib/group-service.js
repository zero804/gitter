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
var validateGitHubUri = require('gitter-web-github').GitHubUriValidator;
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

function findByIds(ids) {
  return mongooseUtils.findByIds(Group, ids);
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
  var linkPath = options.linkPath;
  var externalId = options.externalId || null;

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

      var securityDescriptor;
      if (type) {
        securityDescriptor = groupSecurityDescriptorGenerator.generate(user, {
            type: type,
            linkPath: linkPath,
            externalId: externalId,
          });
      } else {
        securityDescriptor = groupSecurityDescriptorGenerator.getDefaultGroupSecurityDescriptor(user._id);
      }

      return securityDescriptorService.insertForGroup(group._id, securityDescriptor)
        .return(group);
    });
}

function ensureGitHubAccessAndFetchGroupInfo(user, options) {
  var name = options.name;
  var uri = options.uri;
  var type = options.type;

  var linkPath = options.linkPath;
  assert(linkPath, 'linkPath required');

  return validateGitHubUri(user, linkPath)
    .then(function(githubInfo) {
      debug("GitHub information for %s is %j", linkPath, githubInfo);

      if (!githubInfo) throw new StatusError(404);

      if (type === 'GH_ORG' && githubInfo.type !== 'ORG') {
        throw new StatusError(400, 'linkPath is not an org: ' + linkPath);
      }
      if (type === 'GH_USER' && githubInfo.type !== 'USER') {
        throw new StatusError(400, 'linkPath is not a user: ' + linkPath);
      }

      // for migration cases below
      if (type === 'GH_GUESS') {
        type = 'GH_'+githubInfo.type;
      }

      return canAdminPotentialGitHubGroup(user, githubInfo, options.obtainAccessFromGitHubRepo)
        .then(function(isAdmin) {
          if (!isAdmin) throw new StatusError(403, 'Not an administrator of this org');
          return {
            type: type,
            name: name,
            uri: uri,
            linkPath: linkPath,
            externalId: githubInfo.githubId || null
          }
        });
    });
}

function ensureAccessAndFetchGroupInfo(user, options) {
  options = options || {};

  var name = options.name;
  var uri = options.uri;
  var type = options.type || null;
  assert(user, 'user required');
  assert(name, 'name required');
  assert(uri, 'uri required');

  if (!validateGroupName(name)) {
    throw new StatusError(400, 'Invalid group name');
  }

  if (!validateGroupUri(uri)) {
    throw new StatusError(400, 'Invalid group uri: ' + uri);
  }

  return findByUri(uri)
    .then(function(group) {
      if (group) {
        throw new StatusError(400, 'Group uri already taken: ' + uri);
      }

      switch (type) {
        case 'GH_ORG':
        case 'GH_USER':
        case 'GH_GUESS': // for migration calls to createGroup, see below
          return ensureGitHubAccessAndFetchGroupInfo(user, options);
        case null:
          return {
            type: null,
            name: name,
            uri: uri
          }
        default:
          throw new StatusError(400, 'type is not known: ' + type);
      }
    })
}

function createGroup(user, options) {
  return ensureAccessAndFetchGroupInfo(user, options)
    .then(function(groupInfo) {
      debug("Upserting %j", groupInfo);
      return upsertGroup(user, groupInfo);
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
        type: 'GH_GUESS', // how do we know if it is a GH_ORG or GH_USER? or GH_REPO?
        name: name,
        uri: uri,
        linkPath: uri.split('/')[0], // does this make sense? or rather uri?
        obtainAccessFromGitHubRepo: options.obtainAccessFromGitHubRepo
      });
    });
}

function findRoomsIdForGroup(groupId, userId) {
  assert(groupId, 'groupId is required');

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

/**
 * Given an existing room, ensures that the room has a room
 */
function ensureGroupForRoom(room, user) {
  if (room.groupId) {
    return findById(room.groupId);
  }
  var githubType = room.githubType;

  // One-to-one rooms will never have a group
  if (room.oneToOne || githubType === 'ONETOONE') {
    return null;
  }

  var splitUri = room.uri.split('/');

  var groupUri = splitUri[0];
  var obtainAccessFromGitHubRepo;

  switch(githubType) {
    case 'REPO':
      assert.strictEqual(splitUri.length, 2);
      obtainAccessFromGitHubRepo = room.uri;
      break;

    case 'REPO_CHANNEL':
      assert.strictEqual(splitUri.length, 3);
      obtainAccessFromGitHubRepo = splitUri.slice(0, 2);
      break;

    case 'ORG':
      assert.strictEqual(splitUri.length, 1);
      break;

    case 'USER_CHANNEL':
    case 'ORG_CHANNEL':
      assert.strictEqual(splitUri.length, 3);
      break;

    default:
      throw new StatusError(500, 'Unknown room type: ' + room.githubType);
  }

  return findByUri(groupUri)
    .then(function(group) {
      if (group) return group;

      return createGroup(user, {
        type: 'GH_GUESS', // could be a GH_ORG or GH_USER
        name: groupUri,
        uri: groupUri,
        linkPath: groupUri,
        obtainAccessFromGitHubRepo: obtainAccessFromGitHubRepo
      });
    })
    .tap(function(group) {
      if (!group) return;
      var groupId = group._id;
      room.groupId = groupId;

      return Troupe.update({ _id: room._id }, { $set: { groupId: groupId } })
        .exec();

      // The room is now part of the group.
      // TODO: Technically we should issue a live collection update to all the rooms users
      // but we're going to skip this for now.
    });
}

/**
 * A user is creating a channel. They need a group
 */
function ensureGroupForUser(user) {
  var groupUri = user.username;
  return findByUri(groupUri)
    .then(function(group) {
      if (group) return group;

      return createGroup(user, {
        type: 'GH_USER',
        name: groupUri,
        uri: groupUri,
        linkPath: groupUri
      });
    });
  }

module.exports = {
  findByUri: Promise.method(findByUri),
  findById: Promise.method(findById),
  findByIds: findByIds,
  createGroup: Promise.method(createGroup),
  findRoomsIdForGroup: Promise.method(findRoomsIdForGroup),
  migration: {
    upsertGroup: upsertGroup,
    ensureGroupForGitHubRoomCreation: ensureGroupForGitHubRoomCreation,
    ensureGroupForRoom: Promise.method(ensureGroupForRoom),
    ensureGroupForUser: Promise.method(ensureGroupForUser)
  }
};
