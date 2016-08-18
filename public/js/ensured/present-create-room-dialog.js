'use strict';

var context = require('../utils/context');

function presentCreateRoomDialog(options) {
  var roomCollection = options.troupes;
  var dialogRegion = options.dialogRegion;
  var roomMenuModel = options.roomMenuModel;
  var initialRoomName = options.initialRoomName;

  require.ensure([
    '../models/create-room-view-model',
    '../collections/groups',
    '../collections/repos',
    '../views/modals/create-room-view'
  ], function(require) {
    var CreateRoomModel = require('../models/create-room-view-model');
    var groupModels = require('../collections/groups');
    var repoModels = require('../collections/repos');
    var createRoomView = require('../views/modals/create-room-view');

    var RepoCollection = repoModels.ReposCollection;
    var repoCollection = new RepoCollection();
    repoCollection.fetch();

    function getSuitableGroupId() {
      if (roomMenuModel) {
        var menuBarGroup = roomMenuModel.getCurrentGroup();

        if(menuBarGroup) {
          return menuBarGroup.get('id');
        }
      }

      var slimCurrentTroupe = context.troupe();
      var currentTroupe = roomCollection.get(slimCurrentTroupe.get('id'));

      if(currentTroupe) {
        return currentTroupe.get('groupId');
      }

      // Last ditch effort, perhaps they are visiting a room they haven't joined
      // on page load and we can see the full troupe
      return slimCurrentTroupe.get('groupId');
    }

    var adminGroupsCollection = new groupModels.Collection([]);
    adminGroupsCollection.fetch({ data: { type: 'admin' } })
      .then(function() {
        if(adminGroupsCollection.length === 0) {
          window.location.hash = '#createcommunity';
          return;
        }

        var modal = new createRoomView.Modal({
          model: new CreateRoomModel(),
          initialGroupId: getSuitableGroupId(),
          initialRoomName: initialRoomName,
          groupsCollection: adminGroupsCollection,
          roomCollection: roomCollection,
          repoCollection: repoCollection
        });

        dialogRegion.show(modal);
      });

  });
}

module.exports = presentCreateRoomDialog;
