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
      this.$el.addClass('left');
      this.$el.removeClass('right');
    }

    if (!!openState && !pinState) {
      this.$el.addClass('right');
      this.$el.removeClass('left');
    }

    if (!openState) {
      this.$el.removeClass('left');
      this.$el.removeClass('right');
    }
  }, 200),

  onDestroy: function() {
    this.stopListening(this.roomModel);
  },

});

