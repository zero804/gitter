'use strict';

var Promise = require('bluebird');
var StatusError = require('statuserror');
var assert = require('assert');
var validateGitHubUri = require('gitter-web-github').GitHubUriValidator;
var githubPolicyFactory = require('./github-policy-factory');
var debug = require('debug')('gitter:app:security-descriptor-generator');
var securityDescriptorGenerator = require('./security-descriptor-generator');


function canAdminPotentialGitHubGroup(user, githubInfo, obtainAccessFromGitHubRepo) {
  var type = githubInfo.type;
  var uri = githubInfo.uri;
  var githubId = githubInfo.githubId;

  return githubPolicyFactory.createGroupPolicyForGithubObject(user, type, uri, githubId, obtainAccessFromGitHubRepo)
    .then(function(policy) {
      return policy.canAdmin();
    });
}

function canAdminGitHubRepo(user, githubInfo, security) {
  var type = githubInfo.type;
  var uri = githubInfo.uri;

  return githubPolicyFactory.createPolicyForGithubObject(user, uri, type, security)
    .then(function(policy) {
      return policy.canAdmin();
    });
}

function ensureGitHubAccessAndFetchDescriptor(user, options) {
  var type = options.type;
  var linkPath = options.linkPath;
  var security = options.security || 'PUBLIC';
  var obtainAccessFromGitHubRepo = options.obtainAccessFromGitHubRepo || null;

  assert(type, "type required");
  assert(linkPath, "linkPath required");

  return validateGitHubUri(user, linkPath)
    .then(function(githubInfo) {
      if (!githubInfo) {
        throw new StatusError(404, linkPath + ' does not exist.')
      }

      debug("GitHub information for %s is %j", linkPath, githubInfo);

      if (security === 'INHERITED') {
        security = githubInfo.security;
      }

      if (!githubInfo) throw new StatusError(404);

      if (type === 'GH_ORG' && githubInfo.type !== 'ORG') {
        throw new StatusError(400, 'linkPath is not an org: ' + linkPath);
      }
      if (type === 'GH_REPO' && githubInfo.type !== 'REPO') {
        throw new StatusError(400, 'linkPath is not a repo: ' + linkPath);
      }
      if (type === 'GH_USER' && githubInfo.type !== 'USER') {
        throw new StatusError(400, 'linkPath is not a user: ' + linkPath);
      }

      // for migration cases below
      if (type === 'GH_GUESS') {
        type = 'GH_'+githubInfo.type;
      }

      var policyPromise;
      if (type === 'GH_REPO') {
        // a room based on a repo
        policyPromise = canAdminGitHubRepo(user, githubInfo, security); // or null?
      } else {
        // org or user based group
        // TODO: or could you have a github user or org backed room going
        // forward too?
        policyPromise = canAdminPotentialGitHubGroup(user, githubInfo, obtainAccessFromGitHubRepo);
      }
      return policyPromise
        .then(function(isAdmin) {
          if (!isAdmin) throw new StatusError(403, 'Not an administrator of this '+githubInfo.type);
          return securityDescriptorGenerator.generate(user, {
              type: type,
              linkPath: linkPath,
              externalId: githubInfo.githubId,
              security: security
            });
        });
    });
}

var ensureAccessAndFetchDescriptor = function(user, options) {
  var type = options.type || null;
  // options can also contain security, linkPath, obtainAccessFromGitHubRepo

  switch (type) {
    case 'GH_ORG':
    case 'GH_REPO':
    case 'GH_USER':
    case 'GH_GUESS': // for migration calls to createGroup
      if (type === 'GH_REPO') {
        options.obtainAccessFromGitHubRepo = options.linkPath;
      }
      return ensureGitHubAccessAndFetchDescriptor(user, options);

    case null:
      return securityDescriptorGenerator.generate(user, options);

    default:
      throw new StatusError(400, 'type is not known: ' + type);
  }
}

module.exports = Promise.method(ensureAccessAndFetchDescriptor);
