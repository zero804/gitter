'use strict';

var Marionette  = require('backbone.marionette');
var template    = require('./base-collection-item-view.hbs');
var toggleClass = require('utils/toggle-class');

module.exports = Marionette.ItemView.extend({

  className: 'room-item',
  template:  template,

  triggers: {
    'click': 'item:clicked',
  },

  modelEvents: {
    'change:selected': 'onSelectedChange',
    'change:focus':    'onItemFocused',
    'change:unreadItems change:mentions change:activity': 'render',
  },

  ui: {
    container: '#room-item__container'
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

  onSelectedChange: function(model, val) { //jshint unused: true
    toggleClass(this.ui.container[0], 'selected', !!val);
  },

  onItemFocused: function(model, val) {//jshint unused: true
    toggleClass(this.ui.container[0], 'focus', !!val);
  },

});
