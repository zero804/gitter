'use strict';

var Marionette = require('backbone.marionette');
var template   = require('./footer-view.hbs');

module.exports = Marionette.ItemView.extend({
  template: template,
  className: 'panel-footer',

  modelEvents: {
    'change': 'render'
  },

  events: {
    'click #room-menu-footer-pin-button': 'onPinButtonClicked',
  },
  initialize: function(attrs) {
    if (!attrs || !attrs.bus) {
      throw new Error('A valid event bus must be passed to a new instance of PanelFooterView');
    }

    this.bus = attrs.bus;
  },

  onPinButtonClicked: function(e) {
    e.preventDefault();
    var newVal = !this.model.get('roomMenuIsPinned');
    this.model.set({ roomMenuIsPinned: newVal });
    this.bus.trigger('room-menu:pin', newVal);
  },


});
