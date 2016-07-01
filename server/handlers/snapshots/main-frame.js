"use strict";

var _ = require('lodash');
var parseRoomsIntoLeftMenuRoomList = require('gitter-web-shared/rooms/left-menu-room-list.js');
var parseRoomsIntoLeftMenuFavouriteRoomList = require('gitter-web-shared/rooms/left-menu-room-favourite-list');
var getOrgNameFromUri = require('gitter-web-shared/get-org-name-from-uri');
var resolveRoomAvatarSrcSet = require('gitter-web-shared/avatars/resolve-room-avatar-srcset');
var suggestedOrgsFromRoomList = require('gitter-web-shared/orgs/suggested-orgs-from-room-list');
var mapGroupsForRenderer = require('../map-groups-for-renderer');

module.exports = function getMainFrameSnapshots(req, troupeContext, rooms, groups) {
  var hasGroups = req.fflip && req.fflip.has('groups');
  var currentRoom = (req.troupe || {});
  var groupName = getOrgNameFromUri(currentRoom.uri);
  var lastLeftMenuSnapshot = (troupeContext.leftRoomMenuState || {});
  req.uriContext = (req.uriContext || {});
  var uri = req.uriContext.uri;
  var selectedOrgName = lastLeftMenuSnapshot.selectedOrgName;
  var tempOrg = [];

  //Left menu state
  //------------------------------------------------------
  //Default new state is "All Conversations"
  var menuState = (lastLeftMenuSnapshot.state || 'all');
  //If you are loading a home view then activate the search state
  if(uri === 'home') { menuState = 'search'; }

  //Groups
  //------------------------------------------------------
  if(hasGroups) {
    groups = mapGroupsForRenderer(groups);
  }
  else {
    groups = suggestedOrgsFromRoomList(rooms, uri, currentRoom.id, currentRoom);
  }

  var hasJoinedRoom = _.findWhere(rooms, { uri: currentRoom.uri});
  //The old group generation adds the tep-org with a prop of temp so we account for that here
  var hasJoinedGroup = _.findWhere(groups, { name: groupName }) && !_.findWhere(groups, { temp: true });

  if(uri !== 'home' && !hasJoinedRoom && !hasJoinedGroup) {
    menuState = 'org';
    selectedOrgName = groupName;
    if(hasGroups) {
      tempOrg = {
        name: selectedOrgName,
        avatarSrcset: resolveRoomAvatarSrcSet({ uri: selectedOrgName}, 22),
        type: 'org',
        active: true,
        hidden: false
      };
    }
  }

  return {
    leftMenu: _.extend({}, lastLeftMenuSnapshot, {
      state: menuState,
      tempOrg: tempOrg,
      selectedOrgName: selectedOrgName,
    }),
    allRooms: rooms,
    rooms: parseRoomsIntoLeftMenuRoomList(menuState, rooms, selectedOrgName),
    favourites: parseRoomsIntoLeftMenuFavouriteRoomList(menuState, rooms, selectedOrgName),
    groups: groups,
  };
};
