'use strict';

var Promise = require('bluebird');
var StatusError = require('statuserror');
var assert = require('assert');
var validateGitHubUri = require('gitter-web-github').GitHubUriValidator;
var legacyPolicyFactory = require('./legacy-policy-factory');
var debug = require('debug')('gitter:app:security-descriptor-generator');
var securityDescriptorGenerator = require('./security-descriptor-generator');


function canAdminPotentialGitHubGroup(user, githubInfo, obtainAccessFromGitHubRepo) {
  var type = githubInfo.type;
  var uri = githubInfo.uri;
  var githubId = githubInfo.githubId;

  // TODO: just use securityDescriptorGenerator.generate()?
  return legacyPolicyFactory.createGroupPolicyForGithubObject(user, type, uri, githubId, obtainAccessFromGitHubRepo)
    .then(function(policy) {
      return policy.canAdmin();
    });
}

function canAdminGitHubRepo(user, githubInfo, security) {
  var type = githubInfo.type;
  var uri = githubInfo.uri;

  return legacyPolicyFactory.createPolicyForGithubObject(user, uri, type, security)
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
        // TODO: or could you have a room like that too?
        policyPromise = canAdminPotentialGitHubGroup(user, githubInfo, obtainAccessFromGitHubRepo);
      }
      return policyPromise
        .then(function(isAdmin) {
          if (!isAdmin) throw new StatusError(403, 'Not an administrator of this org');
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
  var security = options.security;
  // options can also contain linkPath, obtainAccessFromGitHubRepo

  switch (type) {
    case 'GH_ORG':
    case 'GH_REPO':
    case 'GH_USER':
    case 'GH_GUESS': // for migration calls to createGroup, see below
      if (type === 'GH_REPO') {
        options.obtainAccessFromGitHubRepo = options.linkPath;
      }
      return ensureGitHubAccessAndFetchDescriptor(user, options);

    case null:
      // TODO: roll this function into generate() and then call that
      return securityDescriptorGenerator.getDefaultSecurityDescriptor(user._id, security);

    default:
      throw new StatusError(400, 'type is not known: ' + type);
  }
}

module.exports = Promise.method(ensureAccessAndFetchDescriptor);
