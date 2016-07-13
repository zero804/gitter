'use strict';

var Promise = require('bluebird');
var policyDelegateFactory = require('./policy-delegate-factory');
var PolicyEvaluator = require('./policies/policy-evaluator');

function securityDescriptorAdminFilter(user, objectsWithSecurityDescriptors) {

  return Promise.map(objectsWithSecurityDescriptors, function(objectsWithSecurityDescriptor) {
    var securityDescriptor = objectsWithSecurityDescriptor.sd;

    var policyDelegate = policyDelegateFactory(user._id, user, securityDescriptor);
    var contextDelegate = null; // No context delegate needed for admin

    var policyEvaluator = new PolicyEvaluator(user._id, securityDescriptor, policyDelegate, contextDelegate);

    return policyEvaluator.canAdmin()
      .then(function(admin) {
        if (admin) return objectsWithSecurityDescriptor;
      });
  }, { concurrency: 32 })
  .then(function(adminSecurityDescriptors) {
    return adminSecurityDescriptors.filter(Boolean);
  });
}

module.exports = securityDescriptorAdminFilter;
