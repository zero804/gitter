'use strict';

var _ = require('underscore');
var getOrgNameFromUri = require('../get-org-name-from-uri');

var defaults = {
  // Works with explicit true/false values, otherwise doesn't get considered
  shouldPreserveState: undefined,
  previousUnloadTime: undefined,
  isOneToOne: false,
};

module.exports = function generateLeftMenuState(leftRoomMenuState, uri, orgs, options) {
  var opts = _.extend({}, defaults, options);
  var currentLeftRoomMenuData = (leftRoomMenuState || {});

  var roomMenuIsPinned = currentLeftRoomMenuData.roomMenuIsPinned;
  var currentState = currentLeftRoomMenuData.state || 'all';
  var currentlySelectedOrgName = currentLeftRoomMenuData.selectedOrgName || '';

  var timeNow = new Date().getTime();
  var previousUnloadTime = opts.previousUnloadTime;
  // 5000 is an arbitrary good-enough threshold to aproximate page-refresh
  var isWithinRefreshTimeThreshold = previousUnloadTime && (timeNow - previousUnloadTime) < 5000;

  // Only try to resolve their state if they aren't "refreshing"
  if(opts.shouldPreserveState !== true && (opts.shouldPreserveState === false || !isWithinRefreshTimeThreshold)) {
    currentlySelectedOrgName = getOrgNameFromUri(uri);

    var isCurrentOrgInOrgList = orgs.some(function(org) {
      return org.name === currentlySelectedOrgName;
    });

    if(isCurrentOrgInOrgList) {
      currentState = 'org';
    }
    else if(opts.isOneToOne) {
      currentState = 'people';
    }
    else if(uri === 'home') {
      currentState = 'search';
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
