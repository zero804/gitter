/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var githubMembers = require('./github/github-members');
var Q = require('q');

function canUserBeInvitedToJoinRoom(usernameToBeInvited, troupe, instigatingUser) {
  switch(troupe.githubType) {
    case 'REPO':
      return canUserJoinRoomWithUri(usernameToBeInvited, troupe.uri, 'REPO', instigatingUser);

    case 'ORG':
      return canUserJoinRoomWithUri(usernameToBeInvited, troupe.uri, 'ORG', instigatingUser);

    case 'ONETOONE':
      /* Nobody can be added */
      return Q.resolve(false);

    case 'REPO_CHANNEL':
    case 'ORG_CHANNEL':
      switch(troupe.security) {
        case 'PRIVATE':
        case 'PUBLIC':
          /* Anyone can be added */
          return Q.resolve(true);

        case 'INHERITED':
          var parentUri = troupe.uri.split('/').slice(0, -1).join('/');
          var parentRoomType = troupe.githubType === 'REPO_CHANNEL' ? 'REPO' : 'ORG';

          return canUserJoinRoomWithUri(usernameToBeInvited, parentUri, parentRoomType, instigatingUser);

        default:
          /* Dont know what kind of permission this is */
          return Q.reject(400);
      }
      break;

    case 'USER_CHANNEL':
      /* Anyone can be added, whether its PUBLIC or PRIVATE */
      return Q.resolve(true);

    default:
      /* Dont know what kind of room this is */
      return Q.reject(400);
  }
}

function canUserJoinRoomWithUri(username, uri, githubType, githubTokenUser) {
  return githubMembers.isMember(username, uri, githubType, githubTokenUser);
}

module.exports = canUserBeInvitedToJoinRoom;
