'use strict';

var Marionette      = require('backbone.marionette');
var appEvents       = require('utils/appevents');
var PanelHeaderView = require('./panel-header-view');

require('views/behaviors/isomorphic');

module.exports = Marionette.LayoutView.extend({

  modelEvents: {
    'change:panelOpenState': 'onPanelOpenStateChange',
  },

  initialize: function() {
    this.header = new PanelHeaderView({ el: '#panel-header', model: this.model });
    this.header.render();
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
