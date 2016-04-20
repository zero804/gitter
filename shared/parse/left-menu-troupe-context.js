'use strict';

var _                            = require('underscore');
var getOrgNameFromTroupeName     = require('../get-org-name-from-troupe-name');


var resolvePageLoadedLeftMenuState = function(currentLeftRoomMenuData, req) {
  var currentState = currentLeftRoomMenuData.state;
  var currentlySelectedOrg = currentLeftRoomMenuData.selectedOrgName;

  // If actually on a room page that needs some auto-resolving
  if(req.troupe) {
    var timeNow = new Date().getTime();
    var previousLocationUnloadTime = req.cookies.previousLocationUnloadTime;
    // 5000 is an arbitrary good-enough threshold to aproximate page-refresh
    var isWithinRefreshTimeThreshold = previousLocationUnloadTime && (timeNow - previousLocationUnloadTime) < 5000;

    if(!isWithinRefreshTimeThreshold) {
      currentState = 'org';
      currentlySelectedOrg = getOrgNameFromTroupeName(req.troupe.uri);
    }
  }

  return {
    state: currentState,
    selectedOrgName: currentlySelectedOrg
  };
};



module.exports = function parseLeftMenuTroupeContext(req, troupeContext, orgs, minibarOrgList) {

  var currentLeftMenuState = (troupeContext.leftRoomMenuState || {});

  var resolvedLeftMenuPageLoadedState = resolvePageLoadedLeftMenuState(currentLeftMenuState, req);
  _.extend(currentLeftMenuState, resolvedLeftMenuPageLoadedState);

  //we need to check he ONLY if the value is not false
  //If it is null or undefined then we define it as true JP 14/3/16
  if(currentLeftMenuState.roomMenuIsPinned !== false) {
    currentLeftMenuState.roomMenuIsPinned = true;
  }

  return {
    roomMenuIsPinned:        currentLeftMenuState.roomMenuIsPinned,
    panelOpenState:          currentLeftMenuState.roomMenuIsPinned,
    state:                   (currentLeftMenuState.state || 'all'),
    selectedOrgName:         currentLeftMenuState.selectedOrgName,
    hasDismissedSuggestions: (currentLeftMenuState.hasDismissedSuggestions || false),
  };
};
