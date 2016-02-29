'use strict';

var suggestedOrgsFromRoomList  = require('../orgs/suggested-orgs-from-room-list');
var parseLeftMenuTroupeContext = require('./left-menu-troupe-context');

module.exports = function getSnapshotsForPageContext(req, troupeContext, orgs, rooms) {
  return {
    rooms: rooms,
    orgs:  suggestedOrgsFromRoomList(rooms),
    leftMenu: parseLeftMenuTroupeContext(req, troupeContext, orgs),
  };
};
