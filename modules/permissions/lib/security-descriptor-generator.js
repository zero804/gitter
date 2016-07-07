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
  var security = options.security;

  var extraAdmins;
  if (!user || usernameMatchesUri(user, linkPath)) {
    extraAdmins = [];
  } else {
    extraAdmins = [user._id];
  }

  switch(security || null) {
    case 'PUBLIC':
    case null:
      return {
        type: 'GH_USER',
        members: 'PUBLIC',
        admins: 'GH_USER_SAME',
        public: true,
        linkPath: linkPath,
        externalId: externalId,
        extraAdmins: extraAdmins
      };

    case 'PRIVATE':
      return {
        type: 'GH_USER',
        members: 'INVITE',
        admins: 'GH_USER_SAME',
        public: false,
        linkPath: linkPath,
        externalId: externalId,
        extraAdmins: extraAdmins
      };

    default:
      throw new StatusError(500, 'Unknown security type: ' + security);
  }

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

    default:
      throw new StatusError(500, 'Unknown security type: ' + security);
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
  options.type = options.type || null;

  if (options.type) {
    assert(options.linkPath, 'linkPath required');
  }

  switch (options.type) {
    case null:
      return generateDefaultSecurityDescriptor(user, options);

    case 'GH_USER':
      return generateUserSecurityDescriptor(user, options);

    case 'GH_REPO':
      return generateRepoSecurityDescriptor(user, options);

    case 'GH_ORG':
      return generateOrgSecurityDescriptor(user, options);

    default:
      throw new StatusError(500, 'Unknown type: ' + options.type)
  }
}

function generateDefaultSecurityDescriptor(user, options) {
  var members;
  var isPublic;

  switch (options.security || null) {
    case null:
    case 'PUBLIC':
      members = 'PUBLIC';
      isPublic = true;
      break;

    case 'PRIVATE':
      members = 'INVITE';
      isPublic = false;
      break;

    default:
      throw new StatusError(500, 'Unknown security type: ' + options.security);
  }

  return {
    type: null,
    admins: 'MANUAL',
    public: isPublic,
    members: members,
    extraMembers: [],
    extraAdmins: [user._id]
  }
}

module.exports = {
  generate: generate
}
