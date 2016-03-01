'use strict';

var _             = require('underscore');
var closeTemplate = require('./minibar-close-item-view.hbs');
var ItemView      = require('./minibar-item-view.js');

module.exports = ItemView.extend({
  template: closeTemplate,

  initialize: function(attrs) {
    this.roomModel = attrs.roomModel;
    this.listenTo(this.roomModel, 'change:panelOpenState change:roomMenuIsPinned', this.onPanelOpenChange, this);
  },

  onItemClicked: function() {
    this.trigger('minibar-item:close');
  },

  onPanelOpenChange: _.debounce(function() { //jshint unused: true
    var pinState  = this.roomModel.get('roomMenuIsPinned');
    var openState = this.roomModel.get('panelOpenState');

    //if the menu is open && pinned
    if (!!openState && !!pinState) {
      this.el.classList.add('left');
      this.el.classList.remove('right');
    }

    if (!!openState && !pinState) {
      this.el.classList.add('right');
      this.el.classList.remove('left');
    }

    if (!openState) {
      this.el.classList.add('left');
      this.el.classList.remove('right');
    }
  }, 200),

  onDestroy: function() {
    this.stopListening(this.roomModel);
  },

});

