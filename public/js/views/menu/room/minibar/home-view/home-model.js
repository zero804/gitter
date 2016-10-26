"use strict";

var ItemModel = require('../minibar-item-model');

module.exports = ItemModel.extend({

  defaults: {
    mentions: false,
    unreadItems: false,
    type: 'people',
    name: 'people'
  },

  initialize: function(attrs, options) { //jshint unused: true
    console.log('yo yhis is working');
    this.roomCollection = options.roomCollection;
    this.listenTo(this.roomCollection, 'snapshot sync change remove reset', this.onRoomsUpdate, this);
  },

  onRoomsUpdate: function (){
    this.set(this.reduceRooms());
  },

  reduceRooms: function (){
    console.log('reducing');
    return this.roomCollection.reduce(function(memo, room){
      return {
        mentions:    (memo.mentions + room.get('mentions')),
        unreadItems: (memo.unreadItems + room.get('unreadItems')),
      };
    }, { mentions: 0, unreadItems: 0});
  },

});
