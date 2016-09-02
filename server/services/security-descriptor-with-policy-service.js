'use strict';

var secureMethod = require('../utils/secure-method');
var assert = require('assert');
var securityDescriptorService = require('gitter-web-permissions/lib/security-descriptor');

/**
 * This could do with a better name
 */
function SecurityDescriptorWithPolicy(securityDescriptorService, id, sd, policy, ownerGroupId) {
  assert(id, 'id required');
  assert(sd, 'sd required');
  assert(policy, 'Policy required');
  this.securityDescriptorService = securityDescriptorService;
  this.id = id;
  this.ownerGroupId = ownerGroupId;
  this.policy = policy;
  this.sd = sd;
}

function allowAdmin() {
  return this.policy.canAdmin();
}

SecurityDescriptorWithPolicy.prototype.get = secureMethod([allowAdmin], function() {
  return this.sd;
});

SecurityDescriptorWithPolicy.prototype.updateType = secureMethod([allowAdmin], function(newType) {
  return this.securityDescriptorService.modifyType(this.id, newType, {
      groupId: this.ownerGroupId
    });
});

SecurityDescriptorWithPolicy.prototype.addExtraAdmin = secureMethod([allowAdmin], function(userId) {
  return this.securityDescriptorService.addExtraAdmin(this.id, userId);
});

SecurityDescriptorWithPolicy.prototype.removeExtraAdmin = secureMethod([allowAdmin], function(userId) {
  return this.securityDescriptorService.removeExtraAdmin(this.id, userId);
});

SecurityDescriptorWithPolicy.prototype.listExtraAdmins = secureMethod([allowAdmin], function() {
  return this.securityDescriptorService.findExtraAdmins(this.id);
});

function createForGroup(group, policy) {
  return new SecurityDescriptorWithPolicy(securityDescriptorService.group, group._id, group.sd, policy, null);
}

function createForRoom(room, policy) {
  return new SecurityDescriptorWithPolicy(securityDescriptorService.room, room._id, room.sd, policy, room.groupId);
}

function createForForum(forum, policy) {
  return new SecurityDescriptorWithPolicy(securityDescriptorService.forum, forum._id, forum.sd, policy, null);
}

module.exports = {
  createForGroup: createForGroup,
  createForRoom: createForRoom,
  createForForum: createForForum
};
