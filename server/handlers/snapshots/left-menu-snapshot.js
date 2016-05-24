'use strict';

var suggestedOrgsFromRoomList  = require('gitter-web-shared/orgs/suggested-orgs-from-room-list');
var generateLeftMenuState = require('gitter-web-shared/parse/left-menu-state');

module.exports = function getSnapshotsForPageContext(req, troupeContext, rooms) {
  // Generate the org list for the minibar, this is derived from the room list
  var currentRoom    = (req.troupe || {});
  var currentRoomId  = currentRoom.id;
  var minibarOrgList = suggestedOrgsFromRoomList(rooms, req.uriContext.uri, currentRoomId, currentRoom);

  // `?preserveLeftMenuState=true/false` or a session variable
  // We only accept explicit `true`/`false` values
  var preserveLeftMenuState = (req.query.preserveLeftMenuState || '').toLowerCase();
  var shouldPreserveState = preserveLeftMenuState === 'true' ? true : (preserveLeftMenuState === 'false' ? false : undefined);
  if(shouldPreserveState === undefined) {
    shouldPreserveState = req.session.preserveLeftMenuState;
  }
  // Clear it out after use so we don't use it on subsequent requests
  delete req.session.preserveLeftMenuState;

  return {
    rooms:    rooms,
    orgs:     minibarOrgList,

    // In the case a user is viewing a room, owned by an org that they are not a member of
    // we need to change the menu's state so it shows that org as selected both in the minibar
    // and the menu, as such the left-menu context need to know about the org list
    leftMenu: generateLeftMenuState(troupeContext.leftRoomMenuState, req.uriContext.uri, minibarOrgList, {
      shouldPreserveState: shouldPreserveState,
      previousUnloadTime: req.cookies.previousUnloadTime,
      isOneToOne: req.troupe && req.troupe.oneToOne
    }),
  };
};
