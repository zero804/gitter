'use strict';

var context = require('../utils/context');

function presentPermissionsDialog(options) {
  var roomCollection = options.roomCollection;
  var groupCollection = options.groupCollection;
  var dialogRegion = options.dialogRegion;

  require.ensure([
    '../models/permissions-view-model',
    '../views/modals/permissions-view'
  ], function(require) {
    var PermissionsModel = require('../models/permissions-view-model');
    var permissionsView = require('../views/modals/permissions-view');

    var slimCurrentRoom = context.troupe();
    // Try to get something better otherwise work with the slim version
    var currentRoom = roomCollection.get(slimCurrentRoom.get('id')) || slimCurrentRoom;

    var modal = new permissionsView.Modal({
      model: new PermissionsModel({
        entity: currentRoom
      }, {
        groupCollection: groupCollection
      }),
    });

    dialogRegion.show(modal);

  });
}

module.exports = presentPermissionsDialog;
