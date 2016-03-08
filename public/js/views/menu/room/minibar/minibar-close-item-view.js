'use strict';

var _  = require('underscore');
var closeTemplate = require('./minibar-close-item-view.hbs');
var ItemView = require('./minibar-item-view.js');
var generateMenuToggleButton = require('../../../../utils/generate-menu-toggle-button');

module.exports = ItemView.extend({
  template: closeTemplate,

  ui: {
    toggleIcon: '.js-menu-toggle-icon'
  },

  initialize: function(attrs) {
    this.roomModel = attrs.roomModel;
    // 'change:panelOpenState change:roomMenuIsPinned'
    this.listenTo(this.roomModel, 'change:roomMenuIsPinned', this.onPanelPinChange, this);
  },

  onItemClicked: function() {
    this.trigger('minibar-item:close');
  },

  updatePinnedState: function() {
    var pinState  = this.roomModel.get('roomMenuIsPinned');
    //var openState = this.roomModel.get('panelOpenState');

    // We do this because jQuery `toggleClass` doesn't work on SVG
    if(!!pinState) {
      this.ui.toggleIcon[0].classList.add('is-menu-pinned');
    }
    else {
      this.ui.toggleIcon[0].classList.remove('is-menu-pinned');
    }

    this.ui.toggleIcon.trigger('update-toggle-icon-state');
  },

  onPanelPinChange: function() {
    this.updatePinnedState();
  },

  onDestroy: function() {
    this.stopListening(this.roomModel);
  },

  onRender: function() {
    this.updatePinnedState();
    generateMenuToggleButton('.js-menu-toggle-icon', {
      extraMouseOverElement: this.$el
    });
  }

});
