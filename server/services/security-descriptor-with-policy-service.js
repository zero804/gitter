'use strict';

var secureMethod = require('../utils/secure-method');
var assert = require('assert');
var dataAccess = require('gitter-web-permissions/lib/security-descriptor/data-access');
var persistence = require('gitter-web-persistence');

/**
 * This could do with a better name
 */
function SecurityDescriptorWithPolicy(id, Model, sd, policy) {
  assert(id, 'id required');
  assert(sd, 'sd required');
  assert(policy, 'Policy required');
  this.Model = Model;
  this.id = id;
  this.policy = policy;
  this.sd = sd;
}

function allowAdmin() {
  return this.policy.canAdmin();
}

SecurityDescriptorWithPolicy.prototype.get = secureMethod([allowAdmin], function() {
  return this.sd;
});

SecurityDescriptorWithPolicy.prototype.addExtraAdmin = secureMethod([allowAdmin], function(userId) {
  return dataAccess.addExtraAdminForModel(this.Model, this.id, userId);
});

SecurityDescriptorWithPolicy.prototype.removeExtraAdmin = secureMethod([allowAdmin], function(userId) {
  return dataAccess.removeExtraAdminForModel(this.Model, this.id, userId);
});

SecurityDescriptorWithPolicy.prototype.listExtraAdmins = secureMethod([allowAdmin], function() {
  return dataAccess.findExtraAdminsForModel(this.Model, this.id);
});

function createForGroup(id, sd, policy) {
  return new SecurityDescriptorWithPolicy(id, persistence.Group, sd, policy);
}

function createForRoom(id, sd, policy) {
  return new SecurityDescriptorWithPolicy(id, persistence.Troupe, sd, policy);
}

function createForForum(id, sd, policy) {
  return new SecurityDescriptorWithPolicy(id, persistence.Forum, sd, policy);
}

module.exports = {
  createForGroup: createForGroup,
  createForRoom: createForRoom,
  createForForum: createForForum
};
