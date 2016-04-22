'use strict';

var _                        = require('underscore');
var getOrgNameFromTroupeName = require('../get-org-name-from-troupe-name.js');

module.exports = function parseLeftMenuTroupeContext(req, troupeContext, minibarOrgList) {
  var currentLeftRoomMenuData = (troupeContext.leftRoomMenuState || {});

  var roomMenuIsPinned = currentLeftRoomMenuData.roomMenuIsPinned;
  var currentState = currentLeftRoomMenuData.state || 'all';
  var currentlySelectedOrgName = currentLeftRoomMenuData.selectedOrgName || '';

  // Try to resolve the left-menu state if there is an room to look at
  if(req.troupe) {
    var timeNow = new Date().getTime();
    var previousLocationUnloadTime = req.cookies.previousLocationUnloadTime;
    // 5000 is an arbitrary good-enough threshold to aproximate page-refresh
    var isWithinRefreshTimeThreshold = previousLocationUnloadTime && (timeNow - previousLocationUnloadTime) < 5000;
    
    // Only try to resolve their state if they aren't "refreshing"
    if(!isWithinRefreshTimeThreshold) {
      currentlySelectedOrgName = getOrgNameFromTroupeName(req.troupe.uri);

      if(req.troupe.oneToOne) {
        currentlySelectedOrgName = req.uriContext.oneToOneUser.username;
      }

      minibarOrgList.some(function(org) {
        var isCurrentRoomInRoomList = org.name === currentlySelectedOrgName;
        if(isCurrentRoomInRoomList) {
          currentState = 'org';
          // break
          return true;
        }
      });
    }
  }


  // We need to check he ONLY if the value is not false
  // If it is null or undefined then we define it as true JP 14/3/16
  if(roomMenuIsPinned !== false) {
    roomMenuIsPinned = true;
  }

  var result = _.extend({}, currentLeftRoomMenuData, {
    roomMenuIsPinned: roomMenuIsPinned,
    state: currentState,
    selectedOrgName: currentlySelectedOrgName
  });

  return result;
};
