'use strict';

var StatusError = require('statuserror');
var assert = require('assert');

function generateUserSecurityDescriptor(user/*, options */) {
  return {
    type: null,
    members: 'PUBLIC',
    admins: 'MANUAL',
    public: true,
    extraAdmins: [user._id]
  };
}

function generateOrgSecurityDescriptor(user, options) {
  var githubId = options.githubId;
  var uri = options.uri;

  return {
    type: 'GH_ORG',
    members: 'PUBLIC',
    admins: 'GH_ORG_MEMBER',
    public: true,
    linkPath: uri,
    externalId: githubId
  };
}

function generateRepoSecurityDescriptor(user, options) {
  var githubId = options.githubId;
  var uri = options.uri;
  var security = options.security;

  switch(security) {
    case 'PUBLIC':
      return {
        type: 'GH_REPO',
        members: 'PUBLIC',
        admins: 'GH_REPO_PUSH',
        public: true,
        linkPath: uri,
        externalId: githubId
      };

    case 'PRIVATE':
      return {
        type: 'GH_REPO',
        members: 'GH_REPO_ACCESS',
        admins: 'GH_REPO_PUSH',
        public: false,
        linkPath: uri,
        externalId: githubId
      };

    default:
      throw new StatusError(500, 'Unknown security type: ' + security);
  }
}


function generate(user, options) {
  assert(options.uri, 'uri required');

  switch(options.type) {
    case 'USER':
      return generateUserSecurityDescriptor(user, options);

    case 'REPO':
      return generateRepoSecurityDescriptor(user, options);

    case 'ORG':
      return generateOrgSecurityDescriptor(user, options);

    default:
      throw new StatusError(500, 'Unknown type: ' + options.type)
  }
}

module.exports = {
  generate: generate
}
