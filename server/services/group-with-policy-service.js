'use strict';

var assert = require('assert');
var StatusError = require('statuserror');
var securityDescriptorGenerator = require('gitter-web-permissions/lib/security-descriptor-generator');
var Troupe = require('gitter-web-persistence').Troupe;
var debug = require('debug')('gitter:app:group-with-policy-service');
var roomService = require('./room-service');
var secureMethod = require('../utils/secure-method');
var validateRoomName = require('gitter-web-validators/lib/validate-room-name');

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

  var topic = options.topic || null;
  var name = options.name;

  assert(name, 'name required');

  if (!validateRoomName(name)) {
    throw new StatusError(400, 'Invalid room name: ' + name);
  }

  var uri = group.uri + '/' + name;

  // TODO: validate topic

  return findByUri(uri)
    .then(function(room) {
      if (room) {
        throw new StatusError(400, 'Room uri already taken: ' + uri);
      }

      return securityDescriptorGenerator.ensureAccessAndFetchDescriptor(user, options)
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
  var user = this.policy.user;
  var group = this.policy.group;
  return ensureAccessAndFetchRoomInfo(user, group, options)
    .spread(function(roomInfo, securityDescriptor) {
      debug("Upserting %j", roomInfo);
      // NOTE: options.tracking?
      return roomService.upsertGroupRoom(user, group, roomInfo, securityDescriptor);
    });
});


module.exports = GroupWithPolicyService;
