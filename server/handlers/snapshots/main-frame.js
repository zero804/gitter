"use strict";

var _ = require('lodash');
var parseRoomsIntoLeftMenuRoomList = require('gitter-web-shared/rooms/left-menu-room-list.js');
var parseRoomsIntoLeftMenuFavouriteRoomList = require('gitter-web-shared/rooms/left-menu-room-favourite-list');
var getOrgNameFromTroupeName = require('gitter-web-shared/get-org-name-from-troupe-name');
var resolveRoomAvatarSrcSet = require('gitter-web-shared/avatars/resolve-room-avatar-srcset');
var suggestedOrgsFromRoomList = require('gitter-web-shared/orgs/suggested-orgs-from-room-list');
var mapGroupsForRenderer = require('../map-groups-for-renderer');

module.exports = function getMainFrameSnapshots(req, troupeContext, rooms, groups) {
  var hasGroups = req.fflip && req.fflip.has('groups');
  var currentRoom = (req.troupe || {});
  var lastLeftMenuSnapshot = (troupeContext.leftRoomMenuState || {});
  var uri = req.uriContext.uri;
  var selectedOrgName = lastLeftMenuSnapshot.selectedOrgName;
  var tempOrg = [];

  //Left menu state
  //------------------------------------------------------
  //Default new state is "All Conversations"
  var menuState = (lastLeftMenuSnapshot.state || 'all');
  //If you are loading a home view then activate the search state
  if(uri === 'home') { menuState = 'search'; }

  //Rooms
  //------------------------------------------------------
  //If the room is not in the room list we need to switch the state to show the parent group

  else if(!_.findWhere(rooms, { uri: currentRoom.uri})) {
    menuState = 'org';
    selectedOrgName = getOrgNameFromTroupeName(currentRoom.uri);
    tempOrg = [{
      name: selectedOrgName,
      avatarSrcset: resolveRoomAvatarSrcSet({ uri: selectedOrgName}, 22),
      type: 'org',
      active: true,
      hidden: false
    }];
  }

  //Orgs
  //------------------------------------------------------
  if(hasGroups) {
    groups = mapGroupsForRenderer(groups);
  }
  else {
    groups = suggestedOrgsFromRoomList(rooms, uri, currentRoom.id, currentRoom);
  }

  return {
    leftMenu: _.extend({}, lastLeftMenuSnapshot, {
      state: menuState,
      tempOrg: tempOrg,
      selectedOrgName: selectedOrgName,
    }),
    rooms: parseRoomsIntoLeftMenuRoomList(menuState, rooms, selectedOrgName),
    favourites: parseRoomsIntoLeftMenuFavouriteRoomList(menuState, rooms, selectedOrgName),
    groups: groups,
  };
};
