'use strict';

var Marionette    = require('backbone.marionette');

var MiniBarView = Marionette.ItemView.extend({

  events: {
    'click': 'onItemClicked',
  },

  onItemClicked: function() {
    this.trigger('minibar:clicked');
  },

});

module.exports = MiniBarView;
