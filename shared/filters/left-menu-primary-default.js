'use strict';

module.exports = function leftMenuDefaultFilter(room) {
  return !!room.lastAccessTime;
};
