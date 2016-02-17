'use strict';

var Marionette = require('backbone.marionette');
var template   = require('./footer-view.hbs');
var RAF        = require('utils/raf');

require('gitter-styleguide/css/components/buttons.css');

module.exports = Marionette.ItemView.extend({
  template: template,

  modelEvents: {
    'change:state': 'onModelChange',
    'change:searchTerm': 'onModelChange',
  },

  ui: {
    searchFooter: '#panel-footer--search',
    allFooter:    '#panel-footer--all',
    exploreLink:  '#panel-footer__link'
  },

  initialize: function(attrs) {
    if (!attrs || !attrs.bus) {
      throw new Error('A valid event bus must be passed to a new instance of PanelFooterView');
    }

    this.bus = attrs.bus;
  },

  onModelChange: function() {
    RAF(function() {
      var shouldShowSearchFooter = ((this.model.get('state') === 'search') && !this.model.get('searchTerm'));
      this.ui.searchFooter.toggleClass('active', shouldShowSearchFooter);
      this.ui.allFooter.toggleClass('active', (this.model.get('state') !== 'search'));
    }.bind(this));
  },

  onModelChangeSearchTerm: function(mode, val) { //jshint unused: true
    this.ui.searchFooter.toggleClass('active', !!val);
  },

});
