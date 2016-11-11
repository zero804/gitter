'use strict';

var parseRoomsIntoLeftMenuRoomList = require('./left-menu-room-list');
var parseRoomsIntoLeftMenuFavouriteRoomList = require('./left-menu-room-favourite-list');
var parseCategoryForTemplate = require('gitter-web-shared/parse/forum-category-item');

function getLeftMenuViewData(options) {
  var leftMenu = options.leftMenu;
  var rooms = options.rooms;
  var groups = options.groups;

  var leftMenuForumGroupCategories = options.leftMenuForumGroupCategories;
  var leftMenuForumGroup = options.leftMenuForumGroup;

  var forumCategories = (leftMenuForumGroupCategories || []).map(function(category) {
    category.groupUri = leftMenuForumGroup && leftMenuForumGroup.uri;
    return category;
  });

  var forum, parsedRooms, parsedFavourites;

  if(leftMenu.state === 'group') {
    parsedRooms = groups;
    parsedFavourites = [];
  } else {
    parsedRooms = parseRoomsIntoLeftMenuRoomList(leftMenu.state, rooms, leftMenu.groupId);
    parsedFavourites = parseRoomsIntoLeftMenuFavouriteRoomList(leftMenu.state, rooms, leftMenu.groupId);

    if (forumCategories && leftMenu.state === 'org') {
      forum = {
        hasCategories: forumCategories.length > 0,
        categories: forumCategories.map(parseCategoryForTemplate)
      };
    }
  }

  var serializedData = {
    favourites: parsedFavourites,
    rooms: parsedRooms,
    roomMenuIsPinned: leftMenu.roomMenuIsPinned,
    forum: forum,
  }

  return serializedData;
}


module.exports = getLeftMenuViewData;
