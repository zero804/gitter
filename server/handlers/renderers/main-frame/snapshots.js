'use strict';

/**
 * Snapshots are data that will be sent to the client on page load
 */
function getMainFrameSnapshots(options) {
  var leftMenu = options.leftMenu;
  var rooms = options.rooms;
  var groups = options.groups;

  return {
    leftMenu: leftMenu,
    allRooms: rooms,
    groups: groups
  };
}

module.exports = getMainFrameSnapshots;
