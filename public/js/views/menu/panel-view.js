'use strict';

var Marionette = require('backbone.marionette');
var appEvents  = require('utils/appevents');

module.exports = Marionette.ItemView.extend({

  modelEvents: {
    'change:panelOpenState': 'onPanelOpenStateChange',
  },

  initialize: function() {
    appEvents.on('ui:swipeleft', this.onSwipeLeft, this);
  },

  onPanelOpenStateChange: function(model, val) { /*jshint unused: true */
    this.$el.toggleClass('active', val);

    //TODO remove this
    if(!!val) this.$el.click();
  },

  onSwipeLeft: function(e) {
    if(e.target === this.el) { this.model.set('panelOpenState', false); }
  },

});
