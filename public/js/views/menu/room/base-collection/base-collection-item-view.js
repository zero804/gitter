'use strict';

var Marionette = require('backbone.marionette');
var template = require('./base-collection-item-view.hbs');

module.exports = Marionette.ItemView.extend({

  className: 'room-item',
  template:  template,

  trigger: {
    'click': 'item:clicked',
  },

  constructor: function (attrs){
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

  onDestroy: function (){
    delete this.roomMenuModel;
    delete this.index;
  },

});
