'use strict';

var _                        = require('underscore');
var getOrgNameFromTroupeName = require('../get-org-name-from-troupe-name.js');

var defaults = {
  previousUnloadTime: null,
  isOneToOne: false
};

module.exports = function generateLeftMenuState(leftRoomMenuState, roomUri, orgs, options) {
  var opts = _.extend({}, defaults, options);
  var currentLeftRoomMenuData = (leftRoomMenuState || {});

  var roomMenuIsPinned = currentLeftRoomMenuData.roomMenuIsPinned;
  var currentState = currentLeftRoomMenuData.state || 'all';
  var currentlySelectedOrgName = currentLeftRoomMenuData.selectedOrgName || '';

  // Try to resolve the left-menu state if there is an room to look at
  if(roomUri) {
    var timeNow = new Date().getTime();
    var previousUnloadTime = opts.previousUnloadTime;
    // 5000 is an arbitrary good-enough threshold to aproximate page-refresh
    var isWithinRefreshTimeThreshold = previousUnloadTime && (timeNow - previousUnloadTime) < 5000;

    // Only try to resolve their state if they aren't "refreshing"
    if(!isWithinRefreshTimeThreshold) {
      currentlySelectedOrgName = getOrgNameFromTroupeName(roomUri);

      var isCurrentRoomInRoomList = orgs.some(function(org) {
        return org.name === currentlySelectedOrgName;
      });

      if(isCurrentRoomInRoomList) {
        currentState = 'org';
      }
      else if(opts.isOneToOne) {
        currentState = 'people';
      }
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
