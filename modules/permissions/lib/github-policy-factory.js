'use strict';

var Promise = require('bluebird');
var LegacyGitHubPolicyEvaluator = require('./policies/legacy-github-policy-evaluator');
var LegacyGroupPolicyEvaluator = require('./policies/legacy-group-policy-evaluator');

function createPolicyForGithubObject(user, uri, ghType, security) {
  return new LegacyGitHubPolicyEvaluator(user, uri, ghType, security);
}

function createGroupPolicyForGithubObject(user, type, uri, githubId, obtainAccessFromGitHubRepo) {
  var userId = user && user._id;
  return new LegacyGroupPolicyEvaluator(userId, user, type, uri, githubId, obtainAccessFromGitHubRepo)
}

module.exports = {
  createPolicyForGithubObject: Promise.method(createPolicyForGithubObject),
  createGroupPolicyForGithubObject: Promise.method(createGroupPolicyForGithubObject),
};
