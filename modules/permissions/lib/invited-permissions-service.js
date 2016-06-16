"use strict";

var githubMembers = require('gitter-web-github').GitHubMembers;
var Promise = require('bluebird');
var StatusError = require('statuserror');

// TODO: this needs to change to use permissions policies
function canUserBeInvitedToJoinRoom(usernameToBeInvited, troupe, instigatingUser) {
  if(troupe.security === 'PUBLIC') {
    // anyone can join public rooms
    return true;
  }

  if (troupe.oneToOne) {
    return false;
  }

  // TODO: change this for new security descriptor
  switch(troupe.githubType) {
    case 'REPO':
      return githubMembers.isMember(usernameToBeInvited, troupe.uri, 'REPO', instigatingUser);

    case 'ORG':
      return githubMembers.isMember(usernameToBeInvited, troupe.uri, 'ORG', instigatingUser);

    case 'ONETOONE':
      /* Nobody can be added */
      return false;

    case 'REPO_CHANNEL':
    case 'ORG_CHANNEL':
      switch(troupe.security) {
        case 'PRIVATE':
          /* Anyone can be added */
          return true;

        case 'INHERITED':
          var parentUri = troupe.uri.split('/').slice(0, -1).join('/');
          var parentRoomType = troupe.githubType === 'REPO_CHANNEL' ? 'REPO' : 'ORG';

          return githubMembers.isMember(usernameToBeInvited, parentUri, parentRoomType, instigatingUser);

        default:
          /* Dont know what kind of permission this is */
          throw new StatusError(400);
      }
      /* break; */

    case 'USER_CHANNEL':
      /* Anyone can be added, whether its PUBLIC or PRIVATE */
      return true;

    default:
      /* Dont know what kind of room this is */
      throw new StatusError(400, 'Invalid type: ' + troupe.githubType);
  }
}

module.exports = Promise.method(canUserBeInvitedToJoinRoom);
