'use strict';

var assert = require('assert');
var StatusError = require('statuserror');
var ensureAccessAndFetchDescriptor = require('gitter-web-permissions/lib/ensure-access-and-fetch-descriptor');
var Troupe = require('gitter-web-persistence').Troupe;
var debug = require('debug')('gitter:app:group-with-policy-service');
var roomService = require('./room-service');
var secureMethod = require('../utils/secure-method');
var validateRoomName = require('gitter-web-validators/lib/validate-room-name');

/**
 * @private
 */
function validateRoomSecurity(type, security) {
  if (security === 'PUBLIC' || security === 'PRIVATE') {
    return true;
  }
  return false;
}

/**
 * This could do with a better name
 */
function GroupWithPolicyService(group, user, policy) {
  assert(group, 'Group required');
  assert(policy, 'Policy required');
  this.group = group;
  this.user = user;
  this.policy = policy;
}

function allowAdmin() {
  return this.policy.canAdmin();
}

function findByUri(uri) {
  assert(uri, 'uri required');
  return Troupe.findOne({ lcUri: uri.toLowerCase() })
    .lean()
    .exec();
}

function ensureAccessAndFetchRoomInfo(user, group, options) {
  options = options || {};

  var type = options.type || null;

  var security = options.security;
  assert(security, 'security required');

  if (!validateRoomSecurity(type, security)) {
    throw new StatusError(400, 'Invalid room security for ' + type +': '+ security);
  }

  var topic = options.topic;
  // TODO: validate topic

  var name = options.name;

  if (!validateRoomName(name)) {
    throw new StatusError(400, 'Invalid room name: ' + name);
  }

  var uri = group.uri + '/' + name;

  return findByUri(uri)
    .then(function(room) {
      if (room) {
        throw new StatusError(400, 'Room uri already taken: ' + uri);
      }

      return ensureAccessAndFetchDescriptor(user, options)
        .then(function(securityDescriptor) {
          return [{
            topic: topic,
            uri: uri
          }, securityDescriptor];
        });
    })
}


/**
 * Allow admins to create a new room
 * @return {Promise} Promise of room
 */
GroupWithPolicyService.prototype.createRoom = secureMethod([allowAdmin], function(options) {
  var user = this.user;
  var group = this.group;

  if (options.type && group.sd.type !== 'GH_ORG' && group.sd.type !== 'GH_REPO' && group.sd.type !== 'GH_USER') {
    throw new StatusError(400, 'GitHub repo backed rooms can only be added to GitHub org, repo or user backed groups.');
  }

  if (options.linkPath) {
    if (options.linkPath.split('/')[0] !== group.sd.linkPath.split('/')[0]) {
      throw new StatusError(400, 'GitHub repo backed rooms must be for the same owner (gh org or user) as the group.');
    }
  }

  return ensureAccessAndFetchRoomInfo(user, group, options)
    .spread(function(roomInfo, securityDescriptor) {
      debug("Upserting %j", roomInfo);
      return roomService.upsertGroupRoom(user, group, roomInfo, securityDescriptor, {
        tracking: options.tracking
      });
    });
});


module.exports = GroupWithPolicyService;
