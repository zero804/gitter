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

function validateAndFetchBackingInfoForGitHub(user, options) {
  if (!options.linkPath) {
    throw new StatusError(400, 'GitHub objects must have a linkPath');
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

function validateAndFetchBackingInfo(user, options) {
  switch(options.type || null) {
    case null:
      // No backing object. Nothing to do
      return Promise.resolve([null, null]);

    case 'GH_ORG':
    case 'GH_REPO':
    case 'GH_USER':
    case 'GH_GUESS':
      return validateAndFetchBackingInfoForGitHub(user, options);

    case 'GROUP':
      return Promise.resolve(['GROUP', null]);

    default:
      throw new StatusError(400, 'Unknown type: ' + options.type);
  }
}

function ensureAccessAndFetchDescriptor(user, options) {
  var security = options.security || 'PUBLIC';
  var linkPath = options.linkPath;
  var internalId = options.internalId;

  return validateAndFetchBackingInfo(user, options)
    .spread(function(type, githubInfo) {
      return securityDescriptorGenerator.generate(user, {
          type: type,
          linkPath: linkPath,
          externalId: githubInfo && githubInfo.githubId,
          internalId: internalId,
          security: security
        });
    });
}

module.exports = Promise.method(ensureAccessAndFetchDescriptor);
