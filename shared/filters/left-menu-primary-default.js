'use strict';

module.exports = function leftMenuDefaultFilter(room) {
  var lastAccess = (room.lastAccessTime && !!room.lastAccessTime.valueOf) ?
    room.lastAccessTime.valueOf() :
    room.lastAccessTime;
  return !!lastAccess;
};
