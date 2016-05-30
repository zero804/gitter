'use strict';

var secureMethod = require('../utils/secure-method');
var assert = require('assert');
var securityDescriptorGenerator = require('gitter-web-permissions/lib/security-descriptor-generator');

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


function ensureAccessAndFetchRoomInfo(user, group, options) {
  options = options || {};

  var uri = options.uri;
  assert(uri, 'uri required');

  uri = group.uri + '/' + uri;

  var topic = options.topic; // null or ''?

  // TODO: validate topic

  if (!validateRoomUri(uri)) {
    throw new StatusError(400, 'Invalid room uri: ' + uri);
  }

  return troupeService.findByUri(uri)
    .then(function(room) {
      if (room) {
        throw new StatusError(400, 'Room uri already taken: ' + uri);
      }

      return securityDescriptorService.ensureAccessAndFetchDescriptor(user, options)
        .then(function(securityDescriptor) {
          return [{
            name: name,
            uri: uri
          }, securityDescriptor];
        });
    })
}


/**
 * Allow admins to create a new room
 * @return {Promise} Promise of room
 */
GroupWithPolicyService.prototype.createRoom = secureMethod([allowAdmin], function(roomInfo) {
  return ensureAccessAndFetchRoomInfo(user, group, options)
    .spread(function(roomInfo, securityDescriptor) {
      debug("Upserting %j", roomInfo);
      // NOTE: options.tracking?
      return roomService.upsertGroupRoom(user, group, roomInfo, securityDescriptor);
    });
});


module.exports = GroupWithPolicyService;
