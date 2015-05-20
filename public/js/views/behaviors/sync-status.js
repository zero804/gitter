"use strict";
var Marionette = require('backbone.marionette');
var behaviourLookup = require('./lookup');

module.exports = (function() {

  var Behavior = Marionette.Behavior.extend({
    modelEvents: {
      syncStatusChange: 'onSyncStatusChange'
    },
    onSyncStatusChange: function(newState) {
      this.$el
        .toggleClass('synced', newState == 'synced')
        .toggleClass('syncing', newState == 'syncing')
        .toggleClass('syncerror', newState == 'syncerror');
    }
  });

  behaviourLookup.register('SyncStatus', Behavior);
  return Behavior;


})();
