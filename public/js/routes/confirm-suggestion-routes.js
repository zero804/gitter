'use strict';

function createRouter() {

  return {
    'confirmSuggested/*uri': function(uri) {
      var dialogRegion = this.dialogRegion;

      require.ensure(['../views/modals/confirm-repo-room-view'], function(require) {
        var confirmRepoRoomView = require('../views/modals/confirm-repo-room-view');
        dialogRegion.show(new confirmRepoRoomView.Modal({ uri: uri }));
      });
    }
  };
}

module.exports = createRouter;
