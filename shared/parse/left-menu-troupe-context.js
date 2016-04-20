'use strict';

var _                            = require('underscore');
var getOrgNameFromTroupeName     = require('../get-org-name-from-troupe-name');

module.exports = function parseLeftMenuTroupeContext(req, troupeContext, orgs, minibarOrgList) {

  var currentLeftMenuState = (troupeContext.leftRoomMenuState || {});

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
