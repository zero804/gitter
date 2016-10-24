"use strict";

var _ = require('lodash');
var parseRoomsIntoLeftMenuRoomList = require('gitter-web-shared/rooms/left-menu-room-list');
var parseRoomsIntoLeftMenuFavouriteRoomList = require('gitter-web-shared/rooms/left-menu-room-favourite-list');
var parseCategoryForTemplate = require('gitter-web-shared/parse/forum-category-item');
var getOrgNameFromUri = require('gitter-web-shared/get-org-name-from-uri');
var avatars = require('gitter-web-avatars');

module.exports = function getMainFrameSnapshots(req, troupeContext, rooms, groups, extras) { // eslint-disable-line complexity
  //Defaults
  var lastLeftMenuSnapshot = (troupeContext.leftRoomMenuState || {});
  var currentRoom = (req.troupe || {});
  req.uriContext = (req.uriContext || {});

  //Groups
  var groupId = (lastLeftMenuSnapshot.groupId || '');
  var tempOrg;

  //Left menu state
  //------------------------------------------------------
  //Default new state is "All Conversations"
  var menuState = 'all';

  //If loading /home/explore use the state that has been passed through
  if(extras.suggestedMenuState) {
    menuState = extras.suggestedMenuState;
  }

  var hasJoinedRoom = _.findWhere(rooms, { uri: currentRoom.uri });
  var hasJoinedGroup = true;
  if(!hasJoinedRoom) {
    var groupNameFromUri = getOrgNameFromUri(currentRoom.uri);
    hasJoinedGroup = _.findWhere(groups, { uri: groupNameFromUri });
  }

  // But if we find something later, let's use it instead
  if(currentRoom && currentRoom.groupId && !hasJoinedRoom && !hasJoinedGroup) {
    menuState = 'org';
    groupId = currentRoom.groupId;
  }

  var roomMenuIsPinned = true;
  if(lastLeftMenuSnapshot.roomMenuIsPinned !== undefined) {
    roomMenuIsPinned = lastLeftMenuSnapshot.roomMenuIsPinned;
  }

  var forumCategories = (extras.leftMenuForumGroupCategories || []).map(function(category) {
    category.groupUri = extras.leftMenuForumGroup && extras.leftMenuForumGroup.uri;
    return category;
  });

  var parsedRooms = parseRoomsIntoLeftMenuRoomList(menuState, rooms, groupId);
  var parsedFavourites = parseRoomsIntoLeftMenuFavouriteRoomList(menuState, rooms, groupId);
  if(menuState === 'group') { parsedRooms = groups; parsedFavourites = []; }

  return {
    leftMenu: _.extend({}, lastLeftMenuSnapshot, {
      roomMenuIsPinned: roomMenuIsPinned,
      state: menuState,
      tempOrg: tempOrg,
      groupId: groupId,
    }),
    allRooms: rooms,
    rooms: parsedRooms,
    favourites: parsedFavourites,
    groups: groups,
    forum: (menuState === 'org' || menuState === 'temp-org') && {
      hasCategories: forumCategories && forumCategories.length > 0,
      categories: forumCategories && forumCategories.map(parseCategoryForTemplate)
    }
  };
};
