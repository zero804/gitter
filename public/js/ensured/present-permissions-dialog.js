'use strict';

function presentPermissionsDialog(options) {
  var dialogRegion = options.dialogRegion;

  require.ensure([
    '../models/permissions-view-model',
    '../views/modals/permissions-view'
  ], function(require) {
    var PermissionsModel = require('../models/permissions-view-model');
    var permissionsView = require('../views/modals/permissions-view');

      var modal = new permissionsView.Modal({
        model: new PermissionsModel(),
      });

      dialogRegion.show(modal);

  });
}

module.exports = presentPermissionsDialog;
