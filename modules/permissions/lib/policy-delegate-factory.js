'use strict';

var GhRepoPolicyDelegate = require('./policies/gh-repo-policy-delegate');
var GhOrgPolicyDelegate = require('./policies/gh-org-policy-delegate');
var GhUserPolicyDelegate = require('./policies/gh-user-policy-delegate');
var StatusError = require('statuserror');
var userLoaderFactory = require('./user-loader-factory');

function policyDelegateFactory(userId, user, securityDescriptor) {
  var userLoader = userLoaderFactory(userId, user);

  switch(securityDescriptor.type) {
    case 'GH_REPO':
      return new GhRepoPolicyDelegate(userId, userLoader, securityDescriptor);

    case 'GH_ORG':
      return new GhOrgPolicyDelegate(userId, userLoader, securityDescriptor);

    case 'GH_USER':
      return new GhUserPolicyDelegate(userId, userLoader, securityDescriptor);

    case 'ONE_TO_ONE':
      throw new StatusError(500, 'policy-delegate-factory does not support one-to-one types');

    default:
      return null;
  }
}

module.exports = policyDelegateFactory;
