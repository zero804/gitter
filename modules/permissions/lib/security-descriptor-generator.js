'use strict';

var Promise = require('bluebird');
var StatusError = require('statuserror');
var assert = require('assert');
var validateGitHubUri = require('gitter-web-github').GitHubUriValidator;
var legacyPolicyFactory = require('./legacy-policy-factory');
var debug = require('debug')('gitter:app:security-descriptor-generator');


function usernameMatchesUri(user, linkPath) {
  if (!user) return false;
  var currentUserName = user.username;
  if (!currentUserName) return false;

  if (!linkPath) return false;

  return currentUserName.toLowerCase() === linkPath.toLowerCase();
}

function generateUserSecurityDescriptor(user, options) {
  var externalId = options.externalId;
  var linkPath = options.linkPath;

  var extraAdmins;
  if (!user || usernameMatchesUri(user, linkPath)) {
    extraAdmins = [];
  } else {
    extraAdmins = [user._id];
  }

  return {
    type: 'GH_USER',
    members: 'PUBLIC',
    admins: 'GH_USER_SAME',
    public: true,
    linkPath: linkPath,
    externalId: externalId,
    extraAdmins: extraAdmins
  };
}

function generateOrgSecurityDescriptor(user, options) {
  var externalId = options.externalId;
  var linkPath = options.linkPath;
  var security = options.security;

  switch(security || null) {
    case 'PUBLIC':
    case null:
      return {
        type: 'GH_ORG',
        members: 'PUBLIC',
        admins: 'GH_ORG_MEMBER',
        public: true,
        linkPath: linkPath,
        externalId: externalId
      };

    case 'PRIVATE':
      return {
        type: 'GH_ORG',
        members: 'GH_ORG_MEMBER',
        admins: 'GH_ORG_MEMBER',
        public: false,
        linkPath: linkPath,
        externalId: externalId
      };
  }
}

function generateRepoSecurityDescriptor(user, options) {
  var externalId = options.externalId;
  var linkPath = options.linkPath;
  var security = options.security;

  switch (security) {
    case 'PUBLIC':
      return {
        type: 'GH_REPO',
        members: 'PUBLIC',
        admins: 'GH_REPO_PUSH',
        public: true,
        linkPath: linkPath,
        externalId: externalId
      };

    case 'PRIVATE':
      return {
        type: 'GH_REPO',
        members: 'GH_REPO_ACCESS',
        admins: 'GH_REPO_PUSH',
        public: false,
        linkPath: linkPath,
        externalId: externalId
      };

    default:
      throw new StatusError(500, 'Unknown security type: ' + security);
  }
}


function generate(user, options) {
  assert(options.linkPath, 'linkPath required');

  switch (options.type) {
    case 'USER':
    case 'GH_USER':
      return generateUserSecurityDescriptor(user, options);

    case 'REPO':
    case 'GH_REPO':
      return generateRepoSecurityDescriptor(user, options);

    case 'ORG':
    case 'GH_ORG':
      return generateOrgSecurityDescriptor(user, options);

    default:
      throw new StatusError(500, 'Unknown type: ' + options.type)
  }
}

function getDefaultSecurityDescriptor(creatorUserId, isPublic) {
  var members = (isPublic) ? 'PUBLIC' : 'PRIVATE';
  return {
    type: null,
    admins: 'MANUAL',
    public: isPublic,
    members: members,
    extraMembers: [],
    extraAdmins: [creatorUserId]
  }
}

/**
 * @private
 */
function canAdminPotentialGitHubGroup(user, githubInfo, obtainAccessFromGitHubRepo) {
  var type = githubInfo.type;
  var uri = githubInfo.uri;
  var githubId = githubInfo.id;

  return legacyPolicyFactory.createGroupPolicyForGithubObject(user, type, uri, githubId, obtainAccessFromGitHubRepo)
    .then(function(policy) {
      return policy.canAdmin();
    });
}

function ensureGitHubAccessAndFetchDescriptor(user, options) {
  var type = options.type;
  var linkPath = options.linkPath;
  var isPublic = options.public || true;
  var obtainAccessFromGitHubRepo = options.obtainAccessFromGitHubRepo || null;

  assert(type, "type required");
  assert(linkPath, "linkPath required");

  return validateGitHubUri(user, linkPath)
    .then(function(githubInfo) {
      debug("GitHub information for %s is %j", linkPath, githubInfo);

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

      // TODO: should this do something else when adding rooms to existing groups? what?
      return canAdminPotentialGitHubGroup(user, githubInfo, obtainAccessFromGitHubRepo)
        .then(function(isAdmin) {
          if (!isAdmin) throw new StatusError(403, 'Not an administrator of this org');
          return generate(user, {
              type: type,
              linkPath: linkPath,
              externalId: githubInfo.githubId,
              public: isPublic // TODO: how do we validate this?
            });
        });
    });
}

var ensureAccessAndFetchDescriptor = Promise.method(function(user, options) {
  var type = options.type || null;
  var isPublic = options.public || true;
  // options can also contain linkPath, public, obtainAccessFromGitHubRepo

  switch (type) {
    case 'GH_ORG':
    case 'GH_REPO':
    case 'GH_USER':
    case 'GH_GUESS': // for migration calls to createGroup, see below
      return ensureGitHubAccessAndFetchDescriptor(user, options);

    case null:
      return getDefaultSecurityDescriptor(user._id, isPublic);

    default:
      throw new StatusError(400, 'type is not known: ' + type);
  }
});

module.exports = {
  generate: generate,
  getDefaultSecurityDescriptor: getDefaultSecurityDescriptor,
  ensureAccessAndFetchDescriptor: ensureAccessAndFetchDescriptor
}
