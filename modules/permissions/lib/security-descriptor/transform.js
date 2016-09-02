'use strict';

var StatusError = require('statuserror');
var Group = require('gitter-web-persistence').Group;
var Promise = require('bluebird');

function transformFromUnbackedToGroup(sd, groupId) {
  var isPublic = sd.public;
  var members;

  if (isPublic) {
    members = 'PUBLIC';
  } else {
    members = 'INVITE';
  }

  return {
    type: 'GROUP',
    members: members,
    admins: 'GROUP_ADMIN',
    public: isPublic,
    linkPath: null,
    internalId: groupId,
    externalId: null,
    extraAdmins: [],
    extraMembers: []
  }
}

function transformFromGitHubBackedToGroup(sd, groupId) {
  var isPublic = sd.public;
  var members;

  if (isPublic) {
    members = 'PUBLIC';
  } else {
    members = 'INVITE';
  }

  return {
    type: 'GROUP',
    members: members,
    admins: 'GROUP_ADMIN',
    public: isPublic,
    linkPath: null,
    internalId: groupId,
    externalId: null,
    extraAdmins: [],
    extraMembers: []
  }
}

// function transformFromGitHubBackedToUnbacked(Model, sd, newType, options) {
//
// }


// /**
//  * Transform from GROUP to null
//  */
// function transformFromGroupToUnbacked(Model, sd) {
//   var isPublic = sd.public;
//   var members;
//
//   if (isPublic) {
//     members = 'PUBLIC';
//   } else {
//     members = 'INVITE';
//   }
//
//   return {
//     type: null,
//     members: members,
//     admins: 'MANUAL',
//     public: isPublic,
//     linkPath: null,
//     internalId: null,
//     externalId: null,
//     extraAdmins: [], // TODO: XXX: prepopulate this
//     extraMembers: []
//   }
// }

function transform(Model, sd, newType, options) {
  var groupId = options && options.groupId;
  // Idempotent?
  if (sd.type === newType) {
    return sd;
  }

  // Trying to get a group backed by a group
  if (Model === Group && newType === 'GROUP') {
    throw new StatusError(400, 'Groups cannot be backed by groups');
  }

  if (newType === 'GROUP' && !groupId) {
    throw new StatusError(400, 'groupId required');
  }

  switch(sd.type) {
    case 'ONE_TO_ONE':
      // Never allow changing ONE_TO_ONE
      break;

    case null:
      // Unbacked can only become groups right now...
      if (newType !== 'GROUP') break;

      return transformFromUnbackedToGroup(sd, groupId);

    case 'GH_ORG':
    case 'GH_REPO':
    case 'GH_USER':
      switch(newType) {
        // case null:
        //   return transformFromGitHubBackedToUnbacked(Model, sd, newType, options);
        case 'GROUP':
          return transformFromGitHubBackedToGroup(sd, groupId);
      }
      break;

    case 'GROUP':
      // Groups can only become unbacked right now...
      // if (newType !== null) break;
      //
      // return transformFromGroupToUnbacked(sd);
  }

  throw new StatusError(400, 'Cannot transform from ' + sd.type + ' to ' + newType);
}

module.exports = Promise.method(transform);
