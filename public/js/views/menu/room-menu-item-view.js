'use strict';

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
    this.listenTo(appEvents, 'ui:swiperight', this.onSwipeRight, this);
  },

  onSwipeRight: function(e) {
    if (e.target === this.el) {
      this.trigger('room-item-view:clicked', this.$el.data('state-change'));
    }
  },

  onItemClicked: function() {
    this.trigger('room-item-view:clicked', this.$el.data('state-change'));
  },

  onActiveStateChange: function(model, val) {/*jshint unused:true */
    this.$el.toggleClass('active', val);
  },

});
