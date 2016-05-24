'use strict';

var secureMethod = require('../utils/secure-method');
var assert = require('assert');

/**
 * This could do with a better name
 */
function GroupWithPolicyService(group, user, policy) {
  assert(group, 'Room required');
  assert(policy, 'Policy required');
  this.group = group;
  this.user = user;
  this.policy = policy;
}

function allowAdmin() {
  return this.policy.canAdmin();
}

/**
 * Allow admins to create a new room
 * @return {Promise} Promise of room
 */
GroupWithPolicyService.prototype.createRoom = secureMethod([allowAdmin], function() {
});


module.exports = GroupWithPolicyService;
