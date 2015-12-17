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

    this.bus = attrs.bus;
    this.listenTo(this.bus, 'ui:swiperight', this.onSwipeRight, this);

    //This component should be extended here instead of the check
    if (this.model.get('type') === 'favourite') {
      this.listenTo(this.bus, 'room-menu:start-drag', this.onDragStart, this);
      this.listenTo(this.bus, 'room-menu:finish-drag', this.onDragStop, this);
    }
  },

  onDragStart: function() {
    this.$el.addClass('drag-start');
  },

  onDragStop: function() {
    this.$el.removeClass('drag-start');
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
