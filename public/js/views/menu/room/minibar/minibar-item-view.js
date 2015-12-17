'use strict';

var Backbone   = require('backbone');
var Marionette = require('backbone.marionette');
var RAF        = require('utils/raf');

module.exports = Marionette.ItemView.extend({

  events: {
    'click': 'onItemClicked',
  },

  modelEvents: {
    'change:active': 'onActiveStateChange',
  },

  initialize: function(attrs) {
    this.model = (this.model || new Backbone.Model());
    this.model.set({
      type:          this.$el.data('stateChange'),
      orgName:       this.$el.data('org-name'),
      isCloseButton: !!this.$el.find('#menu-close-button').length,
    });

    this.bus     = attrs.bus;
    this.dndCtrl = attrs.dndCtrl;
    this.listenTo(this.bus, 'ui:swiperight', this.onSwipeRight, this);

    //This component should be extended here instead of the check
    if (this.model.get('type') === 'favourite') {
      this.dndCtrl.pushContainer(this.el);
      this.listenTo(this.dndCtrl, 'dnd:start-drag', this.onDragStart, this);
      this.listenTo(this.dndCtrl, 'dnd:end-drag', this.onDragStop, this);
      this.listenTo(this.dndCtrl, 'room-menu:add-favourite', this.onFavourite, this);
    }
  },

  onDragStart: function() {
    this.$el.addClass('drag-start');
  },

  onDragStop: function() {
    this.$el.removeClass('drag-start');
  },

  //Test this
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

  onSwipeRight: function(e) {
    if (e.target === this.el) {
      this._triggerRoomChange();
    }
  },

  onItemClicked: function(e) {
    e.preventDefault();
    this._triggerRoomChange();
  },

  _triggerRoomChange: function() {
    this.trigger('room-item-view:clicked',
                 this.model.get('type'),
                 this.model.get('orgName'),
                 this.model.get('isCloseButton')
                );
  },

  onActiveStateChange: function(model, val) {/*jshint unused:true */
    RAF(function() {
      this.$el.toggleClass('active', val);
    }.bind(this));
  },
});
