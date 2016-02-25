'use strict';

var suggestedOrgsFromRoomList  = require('../orgs/suggested-orgs-from-room-list');

module.exports = function getSnapshotsForPageContext(rooms){
  return {
    rooms: rooms,
    orgs:  suggestedOrgsFromRoomList(rooms),
  };
};
