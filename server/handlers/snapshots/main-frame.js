"use strict";

var parseRoomsIntoLeftMenuRoomList = require('./left-menu/left-menu-room-list');
var parseRoomsIntoLeftMenuFavouriteRoomList = require('./left-menu/left-menu-room-favourite-list');
var parseCategoryForTemplate = require('gitter-web-shared/parse/forum-category-item');
var generateLeftMenuStateForUriContext = require('./left-menu/generate-left-menu-state-for-uri-context');

function getMainFrameSnapshots(req, troupeContext, rooms, groups, extras) {
  var leftMenuPeristedState = troupeContext.leftRoomMenuState; // TODO: remove
  var uriContext = req.uriContext;

  var leftMenu = generateLeftMenuStateForUriContext(uriContext, leftMenuPeristedState, extras);

  var forumCategories = (extras.leftMenuForumGroupCategories || []).map(function(category) {
    category.groupUri = extras.leftMenuForumGroup && extras.leftMenuForumGroup.uri;
    return category;
  });

  var parsedRooms = parseRoomsIntoLeftMenuRoomList(leftMenu.state, rooms, leftMenu.groupId);
  var parsedFavourites = parseRoomsIntoLeftMenuFavouriteRoomList(leftMenu.state, rooms, leftMenu.groupId);

  if(leftMenu.state === 'group') {
    parsedRooms = groups;
    parsedFavourites = [];
  }

  var forum;
  if (forumCategories && (leftMenu.state === 'org' || leftMenu.state === 'temp-org')) {
    forum = {
      hasCategories: forumCategories.length > 0,
      categories: forumCategories.map(parseCategoryForTemplate)
    };
  }

  return {
    leftMenu: leftMenu,
    allRooms: rooms,
    rooms: parsedRooms,
    favourites: parsedFavourites,
    groups: groups,
    forum: forum
  };
}

module.exports = getMainFrameSnapshots;
