'use strict';

var Marionette                      = require('backbone.marionette');
var template                        = require('./base-collection-item-view.hbs');
var updateUnreadIndicatorClassState = require('../../../../components/menu/update-unread-indicator-class-state');
var toggleClass                     = require('utils/toggle-class');

module.exports = Marionette.ItemView.extend({

  className: 'room-item',
  template:  template,

  triggers: {
    'click': 'item:clicked',
  },

  modelEvents: {
    'change:selected': 'onSelectedChange',
    'change:focus':    'onItemFocused',
    'change:unreadItems change:mentions change:activity': 'onUnreadUpdate',
    'focus:item': 'focusItem'
  },

  ui: {
    container: '#room-item__container',
    unreadIndicator: '.room-item__unread-indicator'
  },

  constructor: function(attrs) {
    this.roomMenuModel = attrs.roomMenuModel;
    this.index         = attrs.index;
    Marionette.ItemView.prototype.constructor.apply(this, arguments);
  },

  attributes: function() {
    //TODO specialise this to be data-*-id eg data-room-id
    return {
      'data-id': this.model.get('id'),
    };
  },

  pulseIndicators: function() {
    // Re-trigger the pulse animation
    // 16ms is a good 60-fps number to trigger on which Firefox needs (requestAnimationFrame doesn't work for this)
    Array.prototype.forEach.call(this.ui.unreadIndicator, function(unreadIndicatorElement) {
    unreadIndicatorElement.style.animation = 'none';
      setTimeout(function() {
          unreadIndicatorElement.style.animation = '';
      }, 16);
    });
  },

  onSelectedChange: function(model, val) { //jshint unused: true
    toggleClass(this.ui.container[0], 'selected', !!val);
  },

  onItemFocused: function(model, val) {//jshint unused: true
    toggleClass(this.ui.container[0], 'focus', !!val);
  },

  onUnreadUpdate: function() {
    updateUnreadIndicatorClassState(this.model, this.ui.unreadIndicator);

    // Update the count inside the badge indicator
    var unreadIndicatorContent = '';
    var unreads = this.model.get('unreadItems');
    var mentions = this.model.get('mentions');
    if(mentions === 0 && unreads > 0) {
      unreadIndicatorContent = unreads;
    }
    Array.prototype.forEach.call(  this.ui.unreadIndicator, function(indicatorElement) {
      indicatorElement.innerHTML = unreadIndicatorContent;
    });

    this.pulseIndicators();
  },

  focusItem: function() {
    console.log('focusItem', this);
    this.ui.container.focus();
  }

});
