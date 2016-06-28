"use strict";

var _ = require('lodash');
var parseRoomsIntoLeftMenuRoomList = require('gitter-web-shared/rooms/left-menu-room-list.js');
var parseRoomsIntoLeftMenuFavouriteRoomList = require('gitter-web-shared/rooms/left-menu-room-favourite-list');
var getOrgNameFromTroupeName = require('gitter-web-shared/get-org-name-from-troupe-name');
var resolveRoomAvatarSrcSet = require('gitter-web-shared/avatars/resolve-room-avatar-srcset');

module.exports = function getMainFrameSnapshots(req, troupeContext, rooms) {
  var hasNewLeftMenu = !req.isPhone && req.fflip && req.fflip.has('left-menu');
  var hasGroups = req.fflip && req.fflip.has('groups');
  var currentRoom = (req.troupe || {});
  var lastLeftMenuSnapshot = troupeContext.leftRoomMenuState;
  var uri = req.uriContext.uri;
  var selectedOrgName = lastLeftMenuSnapshot.selectedOrgName;
  var tempOrg = false;

  //Left menu state
  //------------------------------------------------------
  //Default new state is "All Conversations"
  var menuState = (lastLeftMenuSnapshot.state || 'all');
  //If you are loading a home view then activate the search state
  if(uri === 'home') { menuState = 'search'; }

  //Rooms
  //------------------------------------------------------
  //If the room is not in the room list we need to switch the state to show the parent group
  if(rooms.indexOf(currentRoom) === -1) {
    menuState = 'org';
    selectedOrgName = getOrgNameFromTroupeName(currentRoom.uri);
    tempOrg = {
      name: selectedOrgName,
      avatarSrcset: resolveRoomAvatarSrcSet({ uri: selectedOrgName}, 22),
    };
  }

  //Orgs
  //------------------------------------------------------

  return {
    leftMenu: _.extend({}, lastLeftMenuSnapshot, { state: menuState, tempOrg: tempOrg }),
    rooms: parseRoomsIntoLeftMenuRoomList(menuState, rooms, selectedOrgName),
    favourites: parseRoomsIntoLeftMenuFavouriteRoomList(menuState, rooms, selectedOrgName),
  };
};
