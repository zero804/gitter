'use strict';

var presentCreateRoomDialog = require('../ensured/present-create-room-dialog');
var presentCreateCommunityDialog = require('../ensured/present-create-community-dialog');

function createRoutes(options) {
  var roomCollection = options.rooms;
  var roomMenuModel = options.roomMenuModel;

  return {
    'createroom(/:name)': function(initialRoomName) {
      var dialogRegion = this.dialogRegion;

      presentCreateRoomDialog({
        dialogRegion: dialogRegion,
        roomCollection: roomCollection,
        roomMenuModel: roomMenuModel,
        initialRoomName: initialRoomName
      });
    },

    createcommunity: function() {
      var dialogRegion = this.dialogRegion;

      presentCreateCommunityDialog({
        dialogRegion: dialogRegion
      });
    }
  };
}

module.exports = createRoutes;
