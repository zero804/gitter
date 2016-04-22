'use strict';

var _                        = require('underscore');
var getOrgNameFromTroupeName = require('../get-org-name-from-troupe-name.js');

module.exports = function parseLeftMenuTroupeContext(req, troupeContext, orgs, minibarOrgList) {

  var currentLeftMenuState = (troupeContext.leftRoomMenuState || {});
  var currentlySelectedOrg = currentLeftMenuState.selectedOrgName;
  if(req.troupe) {
    currentlySelectedOrg = getOrgNameFromTroupeName(req.troupe.uri);

    if(req.troupe.oneToOne) {
      currentlySelectedOrg = req.uriContext.oneToOneUser.username;
    }
  }

  var currentRoomIsInRoomList = orgs.some(function(org) {
    return org === currentlySelectedOrg
  });

  if(currentRoomIsInRoomList) { currentLeftMenuState.state = 'org' }

  //In the case where we are viewing an room which belongs to an org we have not joined
  //we neeed to set the menu state to org and select that org item JP 8/3/16
  var temporaryOrg = null;
  minibarOrgList.some(function(org) {
    if(org.temp) {
      temporaryOrg = org;
      // break
      return true;
    }
  });

  if(temporaryOrg) {
    currentLeftMenuState.state = 'org';
    currentlySelectedOrg       = temporaryOrg.name;
  }

  //we need to check he ONLY if the value is not false
  //If it is null or undefined then we define it as true JP 14/3/16
  if(currentLeftMenuState.roomMenuIsPinned !== false) {
    currentLeftMenuState.roomMenuIsPinned = true;
  }


  var result = {
    roomMenuIsPinned:        currentLeftMenuState.roomMenuIsPinned,
    panelOpenState:          currentLeftMenuState.roomMenuIsPinned,
    state:                   (currentLeftMenuState.state || 'all'),
    selectedOrgName:         (currentlySelectedOrg || ''),
    hasDismissedSuggestions: (currentLeftMenuState.hasDismissedSuggestions || false),
  };

  return result;
};
