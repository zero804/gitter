'use strict';

module.exports = function getRoomAvatar(roomName) {
  if(!roomName) throw new Error('A valid room name must be passed to getRoomAvatar');
  var name = /\//.test(roomName) ? roomName.split('/')[0] : roomName;
  return 'https://avatars1.githubusercontent.com/' + name;
}
