'use strict';

var _ = require('underscore');
var suggestedOrgsFromRoomList  = require('../orgs/suggested-orgs-from-room-list');

module.exports = function parseLeftMenuTroupeContext(req, troupeContext, orgs, rooms) {

  var currentLeftMenuState    = (troupeContext.leftRoomMenuState || {});
  var currentlySelectedOrg    = req.uriContext.uri.split('/')[0];
  var currentRoomIsInRoomList = !!_.findWhere(orgs, { name: currentlySelectedOrg });

  if(currentRoomIsInRoomList) { currentLeftMenuState.state = 'org'}

  return {
    roomMenuIsPinned:    true,
    state:               (currentLeftMenuState.state || 'all'),
    preRenderedRoomList: (rooms || []),
    selectedOrgName:     (currentLeftMenuState.selectedOrgName || currentlySelectedOrg || ''),
    orgList:             (suggestedOrgsFromRoomList(rooms) || []),
  };
};
