"use strict";

/* 👇 Don't use the default export will bring in tons of client-side libraries that we don't need 👇 */
var roomSort = require('gitter-realtime-client/lib/sorts-filters').pojo;

function getOldLeftMenuViewData(options) {
  var rooms = options.rooms;
  return {
    favourites: rooms
      .filter(roomSort.favourites.filter)
      .sort(roomSort.favourites.sort),
    recents: rooms
      .filter(roomSort.recents.filter)
      .sort(roomSort.recents.sort)
  };
}

module.exports = getOldLeftMenuViewData;
