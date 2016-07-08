'use strict';

var Promise = require('bluebird');
var StatusError = require('statuserror');
var validateGitHubUri = require('gitter-web-github').GitHubUriValidator;
var securityDescriptorGenerator = require('./security-descriptor-generator');
var policyFactory = require('./policy-factory');

/**
 * Ensures the security descriptor type matches the backend object type
 * and resolves the backend type in the case of the nasty
 * `GH_GUESS` option
 * @private
 */
function validateGitHubType(requestedType, actualGitHubType) {
  var expectedGitHubType;

  switch(requestedType) {
    case 'GH_GUESS':
      switch(actualGitHubType) {
        case 'ORG':
          return 'GH_ORG';
        case 'REPO':
          return 'GH_REPO';
        case 'USER':
          return 'GH_USER';
        default:
          throw new StatusError('Unknown GitHub type:' + actualGitHubType);
      }
      /* break; */

    case 'GH_ORG':
      expectedGitHubType = 'ORG';
      break;

    case 'GH_REPO':
      expectedGitHubType = 'REPO';
      break;

    case 'GH_USER':
      expectedGitHubType = 'USER';
      break;

    default:
      throw new StatusError('Unknown type:' + requestedType);
  }

  if (expectedGitHubType !== actualGitHubType) {
    throw new StatusError(400, 'Backing object does not match type: ' + expectedGitHubType + ' vs ' + actualGitHubType);
  }

  return requestedType;
}

function validateAndFetchBackingInfo(user, options) {
  var type = options.type;
  if (!type) {
    // No backing object. Nothing to do
    return Promise.resolve([null, null]);
  }

  if (type !== 'GH_ORG' && type !== 'GH_REPO' && type !== 'GH_USER' && type !== 'GH_GUESS') {
    throw new StatusError(400);
  }

  if (!options.linkPath) {
    throw new StatusError(400);
  }

  return validateGitHubUri(user, options.linkPath)
    .then(function(githubInfo) {
      if (!githubInfo) throw new StatusError(404);
      var type = validateGitHubType(options.type, githubInfo.type);

      var policyEvaluator;
      if (options.obtainAccessFromGitHubRepo) {
        policyEvaluator = policyFactory.getPreCreationPolicyEvaluatorWithRepoFallback(user, type, options.linkPath, options.obtainAccessFromGitHubRepo);
      } else {
        policyEvaluator = policyFactory.getPreCreationPolicyEvaluator(user, type, options.linkPath);
      }

      return policyEvaluator.canAdmin()
        .then(function(isAdmin) {
          if (!isAdmin) throw new StatusError(403);

          return [type, githubInfo];
        });
    });

}

function ensureAccessAndFetchDescriptor(user, options) {
  var security = options.security || 'PUBLIC';
  var linkPath = options.linkPath;

  return validateAndFetchBackingInfo(user, options)
    .spread(function(type, githubInfo) {
      // Deal with INHERITED security rooms
      if (security === 'INHERITED') {
        if (!githubInfo) {
          throw new StatusError('Cannot have INHERITED permissions on a non-GitHub backed object')
        }

        security = githubInfo.security;
      }

      return securityDescriptorGenerator.generate(user, {
          type: type,
          linkPath: linkPath,
          externalId: githubInfo && githubInfo.githubId,
          security: security
        });
    });
}

module.exports = Promise.method(ensureAccessAndFetchDescriptor);
