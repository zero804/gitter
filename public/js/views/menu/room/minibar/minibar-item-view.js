'use strict';

var Backbone   = require('backbone');
var Marionette = require('backbone.marionette');
var appEvents  = require('utils/appevents');

module.exports = Marionette.ItemView.extend({

  events: {
    'click': 'onItemClicked',
  },

  modelEvents: {
    'change:active': 'onActiveStateChange',
  },

  initialize: function() {
    this.model.set('orgId', this.$el.data('room-id'));
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
    this.trigger('room-item-view:clicked', this.model.get('type'), this.model.get('orgId'));
  },

  onActiveStateChange: function(model, val) {/*jshint unused:true */
    this.$el.toggleClass('active', val);
  },

});
