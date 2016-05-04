'use strict';

var Marionette                      = require('backbone.marionette');
var cocktail                        = require('cocktail');
var toggleClass                     = require('utils/toggle-class');
var KeyboardEventMixin              = require('views/keyboard-events-mixin');
var template                        = require('./base-collection-item-view.hbs');
var updateUnreadIndicatorClassState = require('../../../../components/menu/update-unread-indicator-class-state');

var BaseCollectionItemView = Marionette.ItemView.extend({

  className: 'room-item',
  template:  template,

  triggers: {
    'click': 'item:activated',
  },

  keyboardEvents: {
    'room-list-item:activate': 'onItemActivated',
  },

  modelEvents: {
    'activated':     'onItemActivated',
    'change:active': 'onActiveChange',
    'change:focus':    'onItemFocused',
    'change:unreadItems change:mentions change:activity': 'onUnreadUpdate',
    'focus:item': 'focusItem',
    'blur:item': 'blurItem',
    'change:isHidden': 'onHiddenChange',
  },

  ui: {
    container:       '#room-item__container',
    unreadIndicator: '.room-item__unread-indicator',
    title:           '#room-item-title',
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

  getRoomName: function() {
    var model = this.model;

    var name = (model.get('uri') ||
                model.get('url') ||
                model.get('name') ||
                (model.get('fromUser') && model.get('fromUser').username));

    return name;
  },

  getRoomUrl: function() {
    var name = this.getRoomName();
    var url  = (name[0] !== '/') ?  '/' + name : name;

    return url;
  },

  onRender: function (){
    toggleClass(this.el, 'hidden', this.model.get('isHidden'));
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

  onActiveChange: function(model, val) {
    toggleClass(this.ui.container[0], 'active', !!val);
  },

  onKeyboardItemActivated: function(e) {
    // Check to make sure the keyboard event was even spawned from this view
    if(e.target === this.ui.container[0]) {
      this.onItemActivated();
      e.preventDefault();
    }
  },

  onItemActivated: function(e) {
    this.trigger('item:activated');
  },

  onItemFocused: function(model, val) {
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
    this.ui.container.focus();
    toggleClass(this.ui.container[0], 'focus', true);
  },

  blurItem: function() {
    this.ui.container.blur();
    toggleClass(this.ui.container[0], 'focus', false);
  },

  onHiddenChange: function (model, val){
    toggleClass(this.el, 'hidden', val);
  },

});


cocktail.mixin(BaseCollectionItemView, KeyboardEventMixin);


module.exports = BaseCollectionItemView;
