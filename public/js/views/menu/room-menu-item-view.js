'use strict';

var Marionette = require('backbone.marionette');

module.exports = Marionette.ItemView.extend({

  events: {
    'click': 'onItemClicked',
  },

  modelEvents: {
    'change:active': 'onActiveStateChange',
  },

  onItemClicked: function() {
    this.trigger('room-item-view:clicked', this.$el.data('state-change'));
  },

  onActiveStateChange: function(model, val) {/*jshint unused:true */
    this.$el.toggleClass('active', val);
  },

});
