'use strict';

var Marionette    = require('backbone.marionette');
var getRoomAvatar = require('utils/get-room-avatar');
var itemTemplate  = require('./primary-collection-view.hbs');
var _             = require('underscore');


module.exports = Marionette.ItemView.extend({

  className: 'room-item',

  template: itemTemplate,

  triggers: {
    'click': 'item:clicked',
  },

  initialize: function (){
  },

  serializeData: function() {
    var data = this.model.toJSON();
    return _.extend({}, data, {
      roomAvatarUrl:  getRoomAvatar(data.name),
    });
  },

  destroy: function (){
    console.log('--- DESTROY ---');
    Marionette.ItemView.prototype.destroy.apply(this, arguments);
  },

});


