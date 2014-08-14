/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var usernamePermissionsModel = require('./username-permissions-model');
var Q = require('q');


function canUserBeInvitedToJoinRoom(usernameToBeInvited, troupe, instigatingUser) {
  var validator;

  function roomUserValidator(securityRoomUri, githubType) {
    return function(usernameToBeInvited) {
      return usernamePermissionsModel(usernameToBeInvited, 'join', securityRoomUri, githubType, null, { githubTokenUser: instigatingUser });
    };
  }

  /* Next, for INHERITED security, make sure the users have access to the parent room */
  switch(troupe.githubType) {
    case 'REPO':
      validator = roomUserValidator(troupe.uri, 'REPO');
      break;

    case 'ORG':
      validator = roomUserValidator(troupe.uri, 'ORG');
      break;

    case 'ONETOONE':
      /* Nobody can be added */
      return Q.resolve(false);

    case 'REPO_CHANNEL':
    case 'ORG_CHANNEL':
      switch(troupe.security) {
        case 'PRIVATE':
          /* Anyone can be added */
          return Q.resolve(true);

        case 'INHERITED':
          var parentUri = troupe.uri.split('/').slice(0, -1).join('/');
          var parentRoomType = troupe.githubType === 'REPO_CHANNEL' ? 'REPO' : 'ORG';

          validator = roomUserValidator(parentUri, parentRoomType);
          break;

        case 'PUBLIC':
          /* Anyone can be added */
          return Q.resolve(true);
      }
      break;


    case 'USER_CHANNEL':
      /* Anyone can be added, whether its PUBLIC or PRIVATE */
      return Q.resolve(true);

    default:
      /* Dont know what kind of room this is */
      return Q.reject(400);
  }

  return validator(usernameToBeInvited);
}

module.exports = canUserBeInvitedToJoinRoom;
