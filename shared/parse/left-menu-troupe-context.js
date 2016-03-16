'use strict';

var _                        = require('underscore');
var getOrgNameFromTroupeName = require('../get-org-name-from-troupe-name.js');

module.exports = function parseLeftMenuTroupeContext(req, troupeContext, orgs, minibarOrgList) {

  var currentLeftMenuState    = (troupeContext.leftRoomMenuState || {});
  var currentlySelectedOrg    = (currentLeftMenuState.selectedOrgName || getOrgNameFromTroupeName(req.uriContext.uri));
  var currentRoomIsInRoomList = !!_.findWhere(orgs, { name: currentlySelectedOrg });

  if(currentRoomIsInRoomList) { currentLeftMenuState.state = 'org' }

  //In the case where we are viewing an room which belongs to an org we have not joined
  //we neeed to set the menu state to org and select that org item JP 8/3/16
  var temporaryOrg   = _.findWhere(minibarOrgList, { temp: true });

  if(temporaryOrg) {
    currentLeftMenuState.state = 'org';
    currentlySelectedOrg       = temporaryOrg.name;
  }

  //we need to check he ONLY if the value is not false
  //If it is null or undefined then we define it as true JP 14/3/16
  if(currentLeftMenuState.roomMenuIsPinned !== false) {
    currentLeftMenuState.roomMenuIsPinned = true;
  }

  return {
    roomMenuIsPinned:    currentLeftMenuState.roomMenuIsPinned,
    state:               (currentLeftMenuState.state || 'all'),
    selectedOrgName:     (currentlySelectedOrg || ''),
  };
};
