'use strict';

var parseRoomsIntoLeftMenuRoomList = require('./left-menu-room-list');
var parseRoomsIntoLeftMenuFavouriteRoomList = require('./left-menu-room-favourite-list');
var parseGroupsIntoLeftMenuFavouriteGroupList = require('./left-menu-group-favourite-list');

function getLeftMenuViewData(options) {
  var leftMenu = options.leftMenu;
  var rooms = options.rooms;
  var groups = options.groups;

  var parsedRooms, parsedFavourites;

  if(leftMenu.state === 'group') {
    parsedRooms = groups;
    parsedFavourites = [];
  } else {
    parsedRooms = parseRoomsIntoLeftMenuRoomList(leftMenu.state, rooms, leftMenu.groupId);
    parsedFavourites = parseRoomsIntoLeftMenuFavouriteRoomList(leftMenu.state, rooms, leftMenu.groupId);
  }

  var groupFavourites = parseGroupsIntoLeftMenuFavouriteGroupList(groups);

  var serializedData = {
    favourites: parsedFavourites,
    rooms: parsedRooms,
    roomMenuIsPinned: leftMenu.roomMenuIsPinned,
    groupFavourites: groupFavourites
  };

  return serializedData;
}


module.exports = getLeftMenuViewData;
