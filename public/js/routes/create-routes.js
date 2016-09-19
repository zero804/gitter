'use strict';

var presentCreateRoomDialog = require('../ensured/present-create-room-dialog');
var presentCreateCommunityDialog = require('../ensured/present-create-community-dialog');

function createRoutes(options) {
  var roomCollection = options.rooms;
  var groupsCollection = options.groups;
  var roomMenuModel = options.roomMenuModel;

  return {
    'confirm/*uri': function(uri) {
      var dialogRegion = this.dialogRegion;

      require.ensure(['../views/modals/confirm-repo-room-view'], function(require) {
        var confirmRepoRoomView = require('../views/modals/confirm-repo-room-view');
        dialogRegion.show(new confirmRepoRoomView.Modal({
          uri: uri,
        }));
      });
    },

    'createroom(/:name)': function(initialRoomName) {
      var dialogRegion = this.dialogRegion;

      presentCreateRoomDialog({
        dialogRegion: dialogRegion,
        roomCollection: roomCollection,
        groupsCollection: groupsCollection,
        roomMenuModel: roomMenuModel,
        initialRoomName: initialRoomName
      });
    },

    'createcommunity': function() {
      var dialogRegion = this.dialogRegion;

      presentCreateCommunityDialog({
        dialogRegion: dialogRegion
      })
    }
  };
}

module.exports = createRoutes;
