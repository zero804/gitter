"use strict";
var apiClient = require('components/apiClient');
var Backbone  = require('backbone');
var SyncMixin = require('./sync-mixin');

require('filtered-collection');

var SuggestedRoomsCollection = Backbone.Collection.extend({
  sync: SyncMixin.sync,
  fetchForUser: function() {
    this.url = apiClient.user.channel("/suggestedRooms");
    this.fetch();
  },
  fetchForRoom: function() {
    this.url = apiClient.room.channel("/suggestedRooms");
    this.fetch();
  }
});

/* Filters out any rooms the user is already in, provided in options.roomCollection */
var FilteredSuggestionsCollection = Backbone.FilteredCollection.extend({
  initialize: function(models, underlyingOptions) {
    var roomsCollection = underlyingOptions.roomsCollection;
    delete underlyingOptions.roomsCollection;

    var underlyingCollection = this._underlyingCollection = new SuggestedRoomsCollection(models, underlyingOptions);

    var options = {
      collection: underlyingCollection
    };

    Backbone.FilteredCollection.prototype.initialize.call(this, null, options);
    this.setFilter(function(model) {
      return !roomsCollection.get(model.id);
    });
  },
  fetchForUser: function() {
    this._underlyingCollection.fetchForUser();
  },
  fetchForRoom: function() {
    this._underlyingCollection.fetchForRoom();
  }
});


module.exports = {
  Collection: SuggestedRoomsCollection,
  Filtered: FilteredSuggestionsCollection,
};
