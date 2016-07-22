"use strict";

var _ = require('lodash');
var parseRoomsIntoLeftMenuRoomList = require('gitter-web-shared/rooms/left-menu-room-list');
var parseRoomsIntoLeftMenuFavouriteRoomList = require('gitter-web-shared/rooms/left-menu-room-favourite-list');
var getOrgNameFromUri = require('gitter-web-shared/get-org-name-from-uri');
var avatars = require('gitter-web-avatars');

module.exports = function getMainFrameSnapshots(req, troupeContext, rooms, groups, extras) {
  //Defaults
  var lastLeftMenuSnapshot = (troupeContext.leftRoomMenuState || {});
  var currentRoom = (req.troupe || {});
  req.uriContext = (req.uriContext || {});

  //Groups
  var groupId = (lastLeftMenuSnapshot.groupId || '');
  var group = (_.findWhere(groups, { id: groupId }) || {});
  var groupName = group.name;

  var tempOrg;

  //Left menu state
  //------------------------------------------------------
  //Default new state is "All Conversations"
  var menuState = lastLeftMenuSnapshot.state || 'all';
  // Try the suggested
  // ex. If you are loading a home view then activate the search state
  if(extras.suggestedMenuState) {
    menuState = extras.suggestedMenuState;
  }

  var hasJoinedRoom = _.findWhere(rooms, { uri: currentRoom.uri});
  //The old group generation adds the temp-org with a prop of temp so we account for that here
  var hasJoinedGroup = _.findWhere(groups, { name: groupName }) && !_.findWhere(groups, { temp: true });

  // But if we find something later, let's use it instead
  if(groupName && !hasJoinedRoom && !hasJoinedGroup) {
    menuState = 'org';
    tempOrg = {
      name: getOrgNameFromUri(currentRoom.uri),
      avatarUrl: avatars.getForGroupId(currentRoom.groupId),
      type: 'org',
      active: true,
      hidden: false
    };
  }

  var roomMenuIsPinned = true;
  if(lastLeftMenuSnapshot.roomMenuIsPinned !== undefined) {
    roomMenuIsPinned = lastLeftMenuSnapshot.roomMenuIsPinned;
  }

  return {
    leftMenu: _.extend({}, lastLeftMenuSnapshot, {
      roomMenuIsPinned: roomMenuIsPinned,
      state: menuState,
      tempOrg: tempOrg,
      groupId: groupId,
    }),
    allRooms: rooms,
    rooms: parseRoomsIntoLeftMenuRoomList(menuState, rooms, groupId),
    favourites: parseRoomsIntoLeftMenuFavouriteRoomList(menuState, rooms, groupId),
    groups: groups,
  };
};
