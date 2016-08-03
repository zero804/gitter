'use strict';

var assert = require('assert');
var StatusError = require('statuserror');
var ensureAccessAndFetchDescriptor = require('gitter-web-permissions/lib/ensure-access-and-fetch-descriptor');
var debug = require('debug')('gitter:app:group-with-policy-service');
var roomService = require('./room-service');
var secureMethod = require('../utils/secure-method');
var validateRoomName = require('gitter-web-validators/lib/validate-room-name');
var validateProviders = require('gitter-web-validators/lib/validate-providers');
var groupService = require('gitter-web-groups/lib/group-service');
var troupeService = require('./troupe-service');

/**
 * @private
 */
function validateRoomSecurity(type, security) {
  if (security === 'PUBLIC' || security === 'PRIVATE') {
    return true;
  }
  return false;
}

function allowAdmin() {
  return this.policy.canAdmin();
}

function GroupWithPolicyService(group, user, policy) {
  assert(group, 'Group required');
  assert(policy, 'Policy required');
  this.group = group;
  this.user = user;
  this.policy = policy;
}

/**
 * Allow admins to create a new room
 * @return {Promise} Promise of room
 */
GroupWithPolicyService.prototype.createRoom = secureMethod([allowAdmin], function(options) {
  assert(options, 'options required');
  var type = options.type || null;
  var providers = options.providers;
  var security = options.security;
  var name = options.name;

  var user = this.user;
  var group = this.group;

  if (providers && !validateProviders(providers)) {
    throw new StatusError(400, 'Invalid providers ' + providers);
  }

  assert(security, 'security required');

  if (!validateRoomSecurity(type, security)) {
    throw new StatusError(400, 'Invalid room security for ' + type +': '+ security);
  }

  if (!validateRoomName(name)) {
    throw new StatusError(400, 'Invalid room name: ' + name);
  }

  if (options.type && group.sd.type !== 'GH_ORG' && group.sd.type !== 'GH_REPO' && group.sd.type !== 'GH_USER') {
    throw new StatusError(400, 'GitHub repo backed rooms can only be added to GitHub org, repo or user backed groups.');
  }

  if (options.linkPath) {
    if (options.linkPath.split('/')[0] !== group.sd.linkPath.split('/')[0]) {
      throw new StatusError(400, 'GitHub repo backed rooms must be for the same owner (gh org or user) as the group.');
    }
  }

  return this._ensureAccessAndFetchRoomInfo(options)
    .spread(function(roomInfo, securityDescriptor) {
      debug("Upserting %j", roomInfo);

      return roomService.createGroupRoom(user, group, roomInfo, securityDescriptor, {
        tracking: options.tracking,
        runPostGitHubRoomCreationTasks: options.runPostGitHubRoomCreationTasks
      })
    })
    .then(function(results) {
      return results.troupe;
    });
});

GroupWithPolicyService.prototype.setAvatar = secureMethod([allowAdmin], function(url) {
  groupService.setAvatarForGroup(this.group._id, url);
});

/**
 * @private
 */
GroupWithPolicyService.prototype._ensureAccessAndFetchRoomInfo = function(options) {
  var user = this.user;
  var group = this.group;
  var type = options.type || null;
  var providers = options.providers;
  var security = options.security;
  var topic = options.topic;
  var name = options.name;
  var linkPath = options.linkPath;

  // This is probably not needed...
  var obtainAccessFromGitHubRepo = options.obtainAccessFromGitHubRepo;

  var uri = group.uri + '/' + name;

  if (providers && !validateProviders(providers)) {
    throw new StatusError(400, 'Invalid providers ' + providers.toString());
  }

  assert(security, 'security required');

  if (!validateRoomSecurity(type, security)) {
    throw new StatusError(400, 'Invalid room security for ' + type +': '+ security);
  }

  if (!validateRoomName(name)) {
    throw new StatusError(400, 'Invalid room name: ' + name);
  }

  return troupeService.findByUri(uri)
    .then(function(room) {
      if (room) {
        throw new StatusError(409, 'Room uri already taken: ' + uri);
      }

      return ensureAccessAndFetchDescriptor(user, {
          type: type,
          linkPath: linkPath,
          obtainAccessFromGitHubRepo: obtainAccessFromGitHubRepo,
          security: security,
        })
        .then(function(securityDescriptor) {
          return [{
            topic: topic,
            uri: uri,
            providers: providers
          }, securityDescriptor];
        });
    })
}

module.exports = GroupWithPolicyService;
