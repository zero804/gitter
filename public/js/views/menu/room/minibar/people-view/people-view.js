'use strict';

var Backbone = require('backbone');
var _ = require('underscore');
var ItemView = require('../minibar-item-view');
var template = require('./people-view.hbs');

var NotificationModel = Backbone.Model.extend({

  defaults: {
    mentions: false,
    unreadItems: false
  },

  initialize: function(attrs, options) { //jshint unused: true
    this.roomCollection = options.roomCollection;
    this.listenTo(this.roomCollection, 'snapshot sync change remove reset', this.onRoomsUpdate, this);
  },

  onRoomsUpdate: function (){
    this.set(this.reduceRooms());
  },

  reduceRooms: function (){
    return this.roomCollection.where({ githubType: 'ONETOONE' }).reduce(function(memo, room){
      return {
        mentions:    (memo.mentions + room.get('mentions')),
        unreadItems: (memo.unreadItems + room.get('unreadItems')),
      };
    }, { mentions: 0, unreadItems: 0});
  },

  destroy: function (){
    this.stopListening(this.roomCollection);
  },

});

module.exports = ItemView.extend({

  template: template,
  initialize: function(attrs) {
    this.roomCollection = attrs.roomCollection;
    this.notifications = new NotificationModel(null, { roomCollection: this.roomCollection });
    this.listenTo(this.notifications, 'change', this.render, this);
  },

  serializeData: function (){
    return _.extend({}, ItemView.prototype.serializeData.apply(this, arguments), this.notifications.toJSON());
  },

  onDestroy: function (){
    this.stopListening(this.notifications);
    this.notifications.destroy();
  },
});
