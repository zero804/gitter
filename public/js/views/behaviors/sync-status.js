"use strict";
var Marionette = require('marionette');
var behaviourLookup = require('./lookup');

module.exports = (function() {


  var Behavior = Marionette.Behavior.extend({
    initialize: function() {
      if(this.view.model) {
        this.listenTo(this.view.model, 'syncStatusChange', this.syncStatusChange);
      } else {
        this.listenToOnce(this.view, 'render', function() {
          this.listenTo(this.view.model, 'syncStatusChange', this.syncStatusChange);
        });

      }
    },
    syncStatusChange: function(newState) {
      this.$el
        .toggleClass('synced', newState == 'synced')
        .toggleClass('syncing', newState == 'syncing')
        .toggleClass('syncerror', newState == 'syncerror');
    }
  });

  behaviourLookup.register('SyncStatus', Behavior);
  return Behavior;


})();

