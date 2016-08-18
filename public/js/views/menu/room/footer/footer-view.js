'use strict';

var Marionette = require('backbone.marionette');
var template = require('./footer-view.hbs');
var fastdom = require('fastdom');
var toggleClass = require('../../../../utils/toggle-class');

require('gitter-styleguide/css/components/buttons.css');

module.exports = Marionette.ItemView.extend({
  template: template,

  behaviors: {
    Tooltip: {
      '.js-create-room-button': { placement: 'left' }
    }
  },

  modelEvents: {
    'change:state': 'onModelChange',
    'change:searchTerm': 'onModelChange',
  },

  ui: {
    searchFooter: '#panel-footer--search',
    allFooter:    '#panel-footer--all',
  },

  initialize: function(attrs) {
    if (!attrs || !attrs.bus) {
      throw new Error('A valid event bus must be passed to a new instance of PanelFooterView');
    }

    this.bus = attrs.bus;
    this.onModelChange();
  },

  onModelChange: function() {
    fastdom.mutate(function() {
      var shouldShowSearchFooter = ((this.model.get('state') === 'search') && !this.model.get('searchTerm'));
      toggleClass(this.ui.searchFooter[0], 'active', shouldShowSearchFooter);
      toggleClass(this.ui.allFooter[0], 'active', (this.model.get('state') !== 'search'));
    }.bind(this));
  },

  onModelChangeSearchTerm: function(mode, val) { //jshint unused: true
      toggleClass(this.ui.searchFooter[0], 'active', !!val);
  },

});
