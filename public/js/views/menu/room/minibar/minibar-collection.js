'use strict';

var Backbone = require('backbone');
var context = require('utils/context');
var MinibarItemModel = require('./minibar-item-model');

//just use shared/
var getSuggestedOrgsFromRoomList = require('gitter-web-shared/orgs/suggested-orgs-from-room-list');

module.exports = Backbone.Collection.extend({
  model: MinibarItemModel,

  constructor: function(models, attrs, options) {
    if (!attrs || !attrs.roomCollection) {
      throw new Error('A valid RoomCollection must be passed to a new instance of MinibarCollection');
    }

    this.roomCollection = attrs.roomCollection;
    this.listenTo(this.roomCollection, 'snapshot', this.onCollectionSnapshot, this);
    //TODO 'add remove events'
    this.listenTo(this.roomCollection, 'sync change:activity change:unreadItems change:mentions', this.onCollectionUpdate, this);
    this.listenTo(this.roomCollection, 'remove reset', this.onItemRemoved, this);

    Backbone.Collection.prototype.constructor.call(this, models, attrs, options);
  },

  onCollectionUpdate: function() {
    var newCollection = this.getNewCollection();
    this.set(newCollection, { merge: true });
  },

  onItemRemoved: function() {
    this.reset(this.getNewCollection());
  },

  onCollectionSnapshot: function (){
    this.trigger('snapshot');
  },

  getNewCollection: function (){
    var currentRoom = this.roomCollection.get(context.troupe().get('id')) || context.troupe();
    return getSuggestedOrgsFromRoomList(
      this.roomCollection.toJSON(),
      document.location.pathname,
      context.troupe().get('id'),
      currentRoom
    );
  },

});
