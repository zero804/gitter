"use strict";

var _ = require('lodash');

module.exports = function getMainFrameSnapshots(req, troupeContext) {
  var hasNewLeftMenu = !req.isPhone && req.fflip && req.fflip.has('left-menu');
  var hasGroups = req.fflip && req.fflip.has('groups');
  var currentRoom = (req.troupe || {});
  var lastLeftMenuSnapshot = troupeContext.leftRoomMenuState;
  var uri = req.uriContext.uri;

  //Left menu state
  //------------------------------------------------------
  //Default new state is "All Conversations"
  var menuState = (lastLeftMenuSnapshot.state || 'all');
  //If you are loading a home view then activate the search state
  if(uri === 'home') { menuState = 'search'; }

  //Rooms
  //------------------------------------------------------

  return {
    leftMenu: _.extend({}, lastLeftMenuSnapshot, { state: menuState }),
  };
};
