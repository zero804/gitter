'use strict';

var env = require('gitter-web-env');
var config = env.config;
var Promise = require('bluebird');
var StatusError = require('statuserror');
var User = require('gitter-web-persistence').User;
var Group = require('gitter-web-persistence').Group;
var policyFactory = require('gitter-web-permissions/lib/policy-factory');
var validateGitHubUri = require('gitter-web-github').GitHubUriValidator;
var validateGroupUri = require('gitter-web-validators/lib/validate-group-uri');
var debug = require('debug')('gitter:app:groups:group-uri-checker');


function checkLocalUri(uri) {
  /*
  NOTE: When adding a repo room and we're upserting group, then that
  user probably already exists locally, but we should be able to add a
  group for that user anyway. This is how upserting user groups for repo
  rooms has been working for some time and the new create community flow
  isn't live yet, so safe to just disable this for now.
  */
  /*
  return Promise.join(
      User.findOne({ username: uri }).exec(),
      Group.findOne({ lcUri: uri.toLowerCase() }).exec(),
      function(user, group) {
        debug("user: %s, group: %s", !!user, !!group);
        return !!(user || group);
      }
    );
  */
  return Group.findOne({ lcUri: uri.toLowerCase() }).exec()
    .then(function(group) {
      debug("group: %s", !!group);
      return !!group;
    });
}

function checkGitHubUri(user, uri, obtainAccessFromGitHubRepo) {
  var splitsvilleEnabled = config.get('splitsville:enabled');
  if (splitsvilleEnabled) {
    // Don't check if it is a github URI once we split from GitHub because it
    // is irrelevant. A user can take any URI that hasn't been taken by a group
    // or a user yet.
    return Promise.resolve();

  } else {
    // check gh orgs and users
    return validateGitHubUri(user, uri)
      .then(function(githubInfo) {
        var policy;
        if (githubInfo && githubInfo.type === 'ORG') {
          // also check if you can actually admin the org.

          /*
          NOTE: This checks the uri which might not be the same as the group's
          eventual linkPath. Once we drop the extra checks after we split from
          GitHub this canAdmin check will fall away and the only one left will
          be the one inside groupService.createGroup that will test if you're
          allowed to access linkPath.
          */
          policy = policyFactory.getPreCreationPolicyEvaluatorWithRepoFallback(user, 'GH_ORG', uri, obtainAccessFromGitHubRepo);
          return policy.canAdmin()
            .then(function(access) {
              return {
                githubInfo: githubInfo,
                canAdmin: access
              }
            });

        } else if (githubInfo && githubInfo.type === 'USER') {
          /*
          When adding a repo room we have to upsert the group for now. In that
          case you could be adding a repo under your own name, so we have to
          check for that and allow that too. At least for now.
          */
          policy = policyFactory.getPreCreationPolicyEvaluatorWithRepoFallback(user, 'GH_USER', uri, obtainAccessFromGitHubRepo);
          return policy.canAdmin()
            .then(function(access) {
              return {
                githubInfo: githubInfo,
                canAdmin: access
              }
            })
            .catch(StatusError, function(err) {
              debug('StatusError', err.message);
              // User and group do not match, and obtainAccessFromGitHubRepo
              // not provided, denying access
              return {
                githubInfo: githubInfo,
                canAdmin: false
              }
            });

        } else {
          // either not found or not an org, so no reason to check permission
          return {
            githubInfo: githubInfo,
            canAdmin: false // more like N/A
          }
        }
      });
  }
}

function checkIfGroupUriExists(user, uri, obtainAccessFromGitHubRepo) {
  // check length, chars, reserved namespaces, slashes..
  if (!validateGroupUri(uri)) throw new StatusError(400);

  debug('checking %s', uri);

  return Promise.join(
    checkLocalUri(uri),
    checkGitHubUri(user, uri, obtainAccessFromGitHubRepo),
    function(localUriExists, info) {
      var githubInfo = info && info.githubInfo;
      var githubUriExists = !!githubInfo;

      debug('localUriExists: %s, githubUriExists: %s', localUriExists, githubUriExists);

      var allowCreate;
      if (localUriExists) {
        allowCreate = false;
      } else if (githubUriExists) {
        // Until we split from GitHub: If it is a github uri it can only be an
        // org or user and you have to have admin rights for you to be able to
        // create a community for it.
        debug('github type: %s, canAdmin: %s', githubInfo.type, info.canAdmin);
        allowCreate = info.canAdmin;
      } else {
        // if it doesn't exist locally AND it doesn't exist on github, then
        // the user is definitely allowed to create it.
        allowCreate = true;
      }


      return {
        // The future group will either be org-based or of type null which
        // is just the new types that aren't backed by GitHub.
        type: (githubInfo && githubInfo.type === 'ORG') ? 'GH_ORG' : null,
        allowCreate: allowCreate
      };
    });
}

module.exports = Promise.method(checkIfGroupUriExists);
