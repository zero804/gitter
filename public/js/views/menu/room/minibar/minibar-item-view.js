'use strict';

var Marionette = require('backbone.marionette');
var appEvents  = require('utils/appevents');
var RAF        = require('utils/raf');

module.exports = Marionette.ItemView.extend({

  events: {
    'click': 'onItemClicked',
  },

  modelEvents: {
    'change:active': 'onActiveStateChange',
  },

  initialize: function() {
    this.model.set('orgName', this.$el.data('org-name'));
    this.listenTo(appEvents, 'ui:swiperight', this.onSwipeRight, this);
  },

  onSwipeRight: function(e) {
    if (e.target === this.el) {
      this._triggerRoomChange();
    }
  },

  onItemClicked: function(e) {
    e.preventDefault();
    this._triggerRoomChange();
  },

  _triggerRoomChange: function() {
    this.trigger('room-item-view:clicked',
                 this.model.get('type'),
                 this.model.get('orgName')
                );
  },

  onActiveStateChange: function(model, val) {/*jshint unused:true */
    RAF(function() {
      this.$el.toggleClass('active', val);
    }.bind(this));
  },

});
