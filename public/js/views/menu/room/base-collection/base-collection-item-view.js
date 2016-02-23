'use strict';

var Marionette = require('backbone.marionette');
var template = require('./base-collection-item-view.hbs');

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
    container: '#room-item-container'
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
    this.ui.container[0].classList.toggle('selected', !!val);
  },

  onItemFocused: function(model, val) {//jshint unused: true
    this.ui.container[0].classList.toggle('focus', !!val);
  },

});
