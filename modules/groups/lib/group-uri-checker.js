'use strict';

var Promise = require('bluebird');
var StatusError = require('statuserror');

var User = require('gitter-web-persistence').User;
var Group = require('gitter-web-persistence').Group;
var githubPolicyFactory = require('gitter-web-permissions/lib/github-policy-factory');
var validateGitHubUri = require('gitter-web-github').GitHubUriValidator;
var validateGroupUri = require('gitter-web-validators/lib/validate-group-uri');
var debug = require('debug')('gitter:app:groups:group-uri-checker');


function checkLocalUri(uri) {
  return Promise.join(
      // TODO: what about usernames with different case? Should we use a regex
      // rather? See create-owner-report.js for an example.
      User.findOne({ username: uri }).exec(),
      Group.findOne({ lcUri: uri.toLowerCase() }).exec(),
      function(user, group) {
        debug("user: %s, group: %s", !!user, !!group);
        return !!(user || group);
      }
    );
}

function checkGitHubUri(user, uri, obtainAccessFromGitHubRepo) {
  // gh orgs or users
  return validateGitHubUri(user, uri)
    .then(function(githubInfo) {
      if (githubInfo && githubInfo.type === 'ORG') {
        // also check if you can actually admin the org.
        return githubPolicyFactory.createGroupPolicyForGithubObject(user, 'ORG', uri, githubInfo.githubId, obtainAccessFromGitHubRepo)
          .then(function(policy) {
            return policy.canAdmin();
          })
          .then(function(access) {
            return {
              githubInfo: githubInfo,
              canAdmin: access
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

function checkIfGroupUriExists(user, uri, obtainAccessFromGitHubRepo) {
  // check length, chars, reserved namespaces, slashes..
  if (!validateGroupUri(uri)) throw new StatusError(400);

  debug('checking %s', uri);

  return Promise.join(
    checkLocalUri(uri),
    checkGitHubUri(user, uri, obtainAccessFromGitHubRepo),
    function(localUriExists, info) {
      var githubInfo = info.githubInfo;
      var canAdminGitHubOrg = info.canAdmin;
      var githubUriExists = !!githubInfo;

      debug('localUriExists: %s, githubUriExists: %s', localUriExists, githubUriExists);

      var allowCreate;
      if (localUriExists) {
        allowCreate = false;
      } else if (githubUriExists) {
        // If it is a github uri it must be an org and you have to have
        // admin rights for you to be able to create a community for it.

        debug('github type: %s, canAdmin: %s', githubInfo.type, canAdminGitHubOrg);
        allowCreate = (githubInfo.type === 'ORG') && canAdminGitHubOrg;
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
