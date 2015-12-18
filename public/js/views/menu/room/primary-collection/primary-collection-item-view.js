'use strict';

var Marionette    = require('backbone.marionette');
var getRoomAvatar = require('utils/get-room-avatar');
var itemTemplate  = require('./primary-collection-view.hbs');
var _             = require('underscore');

module.exports = Marionette.ItemView.extend({

  className: 'room-item',

  template: itemTemplate,

  attributes: function() {
    var delay = (0.003125 * this.index);
    return {
      'data-room-id': this.model.get('id'),
      'style': 'transition-delay: ' + delay + 's'
    };
  },

  triggers: {
    'click': 'item:clicked',
  },

  constructor: function (attrs){
    this.index = attrs.index;
    Marionette.ItemView.prototype.constructor.apply(this, arguments);
  },

  serializeData: function() {
    var data = this.model.toJSON();
    return _.extend({}, data, {
      roomAvatarUrl:  getRoomAvatar(data.name),
    });
  },
});

