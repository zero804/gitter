'use strict';

var ItemView = require('./minibar-item-view.js');

module.exports = ItemView.extend({
  initialize: function(attrs) {
    this.dndCtrl = attrs.dndCtrl;
    this.dndCtrl.pushContainer(this.el);
    this.listenTo(this.dndCtrl, 'dnd:start-drag', this.onDragStart, this);
    this.listenTo(this.dndCtrl, 'dnd:end-drag', this.onDragStop, this);
    this.listenTo(this.dndCtrl, 'room-menu:add-favourite', this.onFavourite, this);
  },

  onDragStart: function() {
    this.$el.addClass('dragging');
  },

  onDragStop: function() {
    this.$el.removeClass('dragging');
  },

  onFavourite: function() {
    this.$el.addClass('dropped');
    setTimeout(function() {
      this.$el.removeClass('dropped');

      //Dragula places dropped items into the drop container
      //This needs to be fixed upstream
      //util that date just remove the dropped container manually
      //https://github.com/bevacqua/dragula/issues/188
      this.$el.find('.room-item').remove();
    }.bind(this), 200);
  },

  onDestroy: function() {
    this.stopListening(this.dndCtrl);
  },
});

