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
var securityDescriptorGenerator = require('gitter-web-permissions/lib/security-descriptor-generator');

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
  var githubId = options.githubId || null;

  var securityDescriptor = securityDescriptorGenerator.generate(user, {
      uri: uri,
      type: type,
      githubId: githubId,
    });

  return mongooseUtils.upsert(Group, { lcUri: lcUri }, {
      $setOnInsert: {
        name: name,
        uri: uri,
        lcUri: lcUri,
        sd: securityDescriptor
      }
    })
    .spread(function(group /*, updateExisting */) {
      return group;
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
    throw new StatusError(400, 'Invalid group uri: ' + uri);
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
        uri: groupUri,
        name: groupUri,
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
        name: groupUri,
        uri: groupUri
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
