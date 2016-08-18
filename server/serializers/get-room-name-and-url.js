'use strict';

var getRoomNameFromTroupeName = require('gitter-web-shared/get-room-name-from-troupe-name');

function getRoomNameAndUrl(group, item, options) {
  var otherUser = options && options.otherUser;

  var roomName;
  var roomUrl;

  if (item.oneToOne) {
    if (otherUser) {
      roomName = otherUser.displayName;
      roomUrl = '/' + otherUser.username;
    }
  }
  else {
    var uriRoomName = getRoomNameFromTroupeName(item.uri);
    roomName = group ? group.name + '/' + getRoomNameFromTroupeName(item.uri) : item.uri;
    if(uriRoomName === item.uri) {
      roomName = group ? group.name : item.uri;
    }

    roomUrl = '/' + item.uri;
  }

  return {
    name: roomName,
    url: roomUrl
  };
}

module.exports = getRoomNameAndUrl;
