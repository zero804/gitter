"use strict";

var StatusError = require('statuserror');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');

function validateObjectIdsArray(array) {
  if (!array) return true;
  if (!Array.isArray(array)) return false;
  return !array.some(function(item) {
    return !mongoUtils.isLikeObjectId(item);
  });
}

function validateGhRepoDescriptor(descriptor) {
  var usesGH = false;

  switch(descriptor.members) {
    case 'PUBLIC':
    case 'INVITE':
      break;
    case 'GH_REPO_ACCESS':
    case 'GH_REPO_PUSH':
      usesGH = true;
      break;
    default:
      throw new StatusError(403, 'Invalid members attribute: ' + descriptor.members);
  }

  switch(descriptor.admins) {
    case 'MANUAL':
      break;
    case 'GH_REPO_PUSH':
      usesGH = true;
      break;
    default:
      throw new StatusError(403, 'Invalid admins attribute: ' + descriptor.admins);
  }

  if (!usesGH) {
    throw new StatusError(403, 'Unused reference type: GH_REPO');
  }

  if (descriptor.public) {
    switch(descriptor.members) {
      case 'PUBLIC':
      case 'GH_REPO_ACCESS':
        break;
      default:
        throw new StatusError(403, 'Invalid public attribute: ' + descriptor.public);
    }
  }

  var linkPath = descriptor.linkPath;
  if (!linkPath) {
    throw new StatusError(403, 'Invalid empty linkPath attribute for repo');
  }

  var parts = linkPath.split('/');
  if (parts.length !== 2) {
    throw new StatusError(403, 'Invalid linkPath attribute for repo: ' + linkPath);
  }

  if (!parts[0].length || !parts[1].length) {
    throw new StatusError(403, 'Invalid linkPath attribute for repo: ' + linkPath);
  }

  if (!validateObjectIdsArray(parts.extraMembers)) {
    throw new StatusError(403, 'Invalid extraMembers attribute');
  }

  if (!validateObjectIdsArray(parts.extraAdmins)) {
    throw new StatusError(403, 'Invalid extraAdmins attribute');
  }

}

function validateGhOrgDescriptor(descriptor) {
  var usesGH = false;
  switch(descriptor.members) {
    case 'PUBLIC':
    case 'INVITE':
      break;
    case 'GH_ORG_MEMBER':
      usesGH = true;
      break;
    default:
      throw new StatusError(403, 'Invalid members attribute: ' + descriptor.members);
  }

  switch(descriptor.admins) {
    case 'MANUAL':
      break;
    case 'GH_ORG_MEMBER':
      usesGH = true;
      break;
    default:
      throw new StatusError(403, 'Invalid admins attribute: ' + descriptor.admins);
  }

  if (descriptor.public) {
    if (descriptor.members !== 'PUBLIC') {
      throw new StatusError(403, 'Invalid public attribute');
    }
  }

  if (!usesGH) {
    throw new StatusError(403, 'Unused reference type: GH_ORG');
  }

  var linkPath = descriptor.linkPath;

  if (!linkPath) {
    throw new StatusError(403, 'Invalid empty linkPath attribute for org');
  }

  var parts = linkPath.split('/');
  if (parts.length !== 1) {
    throw new StatusError(403, 'Invalid linkPath attribute for org: ' + linkPath);
  }

  if (!validateObjectIdsArray(descriptor.extraMembers)) {
    throw new StatusError(403, 'Invalid extraMembers attribute');
  }

  if (!validateObjectIdsArray(descriptor.extraAdmins)) {
    throw new StatusError(403, 'Invalid extraAdmins attribute');
  }
}

function validateOneToOneDescriptor(descriptor) {
  if (descriptor.members) {
    throw new StatusError(403, 'Invalid members attribute');
  }

  if (descriptor.admins) {
    throw new StatusError(403, 'Invalid admins attribute');
  }

  if (descriptor.public) {
    throw new StatusError(403, 'Invalid public attribute');
  }

  if (descriptor.linkPath) {
    throw new StatusError(403, 'Invalid linkPath attribute');
  }

  if (descriptor.externalId) {
    throw new StatusError(403, 'Invalid externalId attribute');
  }

  if (descriptor.extraMembers) {
    throw new StatusError(403, 'Invalid extraMembers attribute');
  }

  if (descriptor.extraAdmins) {
    throw new StatusError(403, 'Invalid extraAdmins attribute');
  }

}

function validateBasicDescriptor(descriptor) {
  switch(descriptor.members) {
    case 'PUBLIC':
    case 'INVITE':
      break;
    default:
      throw new StatusError(403, 'Invalid members attribute');
  }

  if (descriptor.admins !== 'MANUAL') {
    throw new StatusError(403, 'Invalid admins attribute');
  }

  if (descriptor.public) {
    if (descriptor.members !== 'PUBLIC') {
      throw new StatusError(403, 'Invalid public attribute');
    }
  }

  if (descriptor.linkPath) {
    throw new StatusError(403, 'Invalid linkPath attribute');
  }

  if (!validateObjectIdsArray(descriptor.extraMembers)) {
    throw new StatusError(403, 'Invalid extraMembers attribute');
  }

  if (!validateObjectIdsArray(descriptor.extraAdmins)) {
    throw new StatusError(403, 'Invalid extraAdmins attribute');
  }
}

function validate(descriptor) {
  if (!descriptor) throw new StatusError(403, 'Invalid descriptor');

  switch(descriptor.type) {
    case 'GH_REPO':
      return validateGhRepoDescriptor(descriptor);

    case 'GH_ORG':
      return validateGhOrgDescriptor(descriptor);

    case 'ONE_TO_ONE':
      return validateOneToOneDescriptor(descriptor);

    default:
      if (!descriptor.type) {
        return validateBasicDescriptor(descriptor);
      }

      throw new StatusError(403, 'Invalid descriptor type: ' + descriptor.type);
  }

}

module.exports = validate;
