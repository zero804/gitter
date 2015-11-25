'use strict';

var Marionette = require('backbone.marionette');
var Hammer     = require('hammerjs');

module.exports = Marionette.ItemView.extend({

  modelEvents: {
    'change:panelOpenState': 'onPanelOpenStateChange',
  },

  onPanelOpenStateChange: function(model, val) { /*jshint unused: true */
    this.$el.toggleClass('active', val);
  },

});
