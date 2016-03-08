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

  return {
    roomMenuIsPinned:    true,
    state:               (currentLeftMenuState.state || 'all'),
    selectedOrgName:     (currentlySelectedOrg || ''),
  };
};
