'use strict';

var Marionette = require('backbone.marionette');
var template   = require('./footer-view.hbs');
var RAF        = require('utils/raf');

require('gitter-styleguide/css/components/buttons.css');

module.exports = Marionette.ItemView.extend({
  template: template,
  className: 'panel-footer',

  modelEvents: {
    'change:state': 'onModelChange',
  },

  initialize: function(attrs) {
    if (!attrs || !attrs.bus) {
      throw new Error('A valid event bus must be passed to a new instance of PanelFooterView');
    }

    this.bus = attrs.bus;
  },

  onModelChange: function(model, val) {//jshint unused: true
    RAF(function(){
      this.$el.toggleClass('active', (val === 'search'));
    }.bind(this));
  },

});
