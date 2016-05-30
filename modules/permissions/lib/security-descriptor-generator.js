'use strict';

var StatusError = require('statuserror');
var assert = require('assert');


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

function getDefaultGroupSecurityDescriptor(creatorUserId) {
  return {
    type: null,
    admins: 'MANUAL',
    public: true,
    members: 'PUBLIC',
    extraMembers: [],
    extraAdmins: [creatorUserId]
  }
}

module.exports = {
  generate: generate,
  getDefaultGroupSecurityDescriptor: getDefaultGroupSecurityDescriptor
}
