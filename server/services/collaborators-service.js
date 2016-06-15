'use strict';

var Promise = require('bluebird');
var BackendMuxer = require('gitter-web-backend-muxer');


module.exports = function getCollaboratorForRoom(room, user) {
  var roomType = room.githubType.split('_')[0];
  var backendMuxer = new BackendMuxer(user);

  var typeForSuggestions = null;
  if(roomType === 'REPO') {
    typeForSuggestions = 'GH_REPO';
  }
  else if(roomType === 'ORG') {
    typeForSuggestions = 'GH_ORG';
  }
  return backendMuxer.getInviteUserSuggestions(typeForSuggestions, room.uri);
};
