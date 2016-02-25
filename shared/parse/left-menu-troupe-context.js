'use strict';

var _ = require('underscore');

module.exports = function parseLeftMenuTroupeContext(req, troupeContext, orgs) {

  var currentLeftMenuState    = (troupeContext.leftRoomMenuState || {});
  var currentlySelectedOrg    = req.uriContext.uri.split('/')[0];
  var currentRoomIsInRoomList = !!_.findWhere(orgs, { name: currentlySelectedOrg });

  if(currentRoomIsInRoomList) { currentLeftMenuState.state = 'org'}

  return {
    roomMenuIsPinned:    true,
    state:               (currentLeftMenuState.state || 'all'),
    selectedOrgName:     (currentLeftMenuState.selectedOrgName || currentlySelectedOrg || ''),
  };
};
