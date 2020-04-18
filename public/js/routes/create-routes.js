'use strict';

var presentCreateRoomDialog = require('../ensured/present-create-room-dialog');
var presentCreateCommunityDialog = require('../ensured/present-create-community-dialog');

function createRoutes() {
  return {
    'createroom(/:name)': function(initialRoomName) {
      presentCreateRoomDialog({
        initialRoomName: initialRoomName
      });
    },

    createcommunity: function() {
      presentCreateCommunityDialog();
    }
  };
}

module.exports = createRoutes;
