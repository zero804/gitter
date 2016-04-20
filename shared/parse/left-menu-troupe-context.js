'use strict';

var _                            = require('underscore');
var getOrgNameFromTroupeName     = require('../get-org-name-from-troupe-name');


var resolvePageLoadedLeftMenuState = function(currentLeftRoomMenuData, req) {
  var currentState = currentLeftRoomMenuData.state;
  var currentlySelectedOrg = currentLeftRoomMenuData.selectedOrgName;

  // If actually on a room page that needs some auto-resolving
  if(req.troupe) {
    var referrer = req.get('Referrer') || '';
    var timeNow = new Date().getTime();
    var previousTroupeUri = req.cookies.previousTroupeUri;
    var previousLocationUnloadTime = req.cookies.previousLocationUnloadTime;
    var currentTroupeUri = req.troupe.uri;

    // 5000 is an arbitrary good-enough threshold to aproximate page-refresh
    var isWithinRefreshTimeThreshold = previousLocationUnloadTime && (timeNow - previousLocationUnloadTime) < 5000;

    // If most-likely was not refresh because timing
    // and they came through a link(because referrer).
    // note: `document.referrer` is sticky through refreshes
    var didComeThroughLinkOutsideApp = !isWithinRefreshTimeThreshold && referrer.length > 0;
    // If they navigated to a completely separate URL than what we have saved
    // And they they don't have a referrer meaning they navigated directly most likely
    var didNavigateDirectly =  (!isWithinRefreshTimeThreshold || currentTroupeUri !== previousTroupeUri) && referrer.length === 0;

    if(didComeThroughLinkOutsideApp || didNavigateDirectly) {
      currentState = 'org';
      currentlySelectedOrg = getOrgNameFromTroupeName(req.troupe.uri);
    }


    console.log('asdf', currentTroupeUri, previousTroupeUri, referrer, isWithinRefreshTimeThreshold, (timeNow - previousLocationUnloadTime), previousLocationUnloadTime);
    console.log('didComeThroughLinkOutsideApp', didComeThroughLinkOutsideApp);
    console.log('didNavigateDirectly', didNavigateDirectly);
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
