'use strict';

var apiClient = require('components/apiClient');
var Backbone = require('backbone');
var SyncMixin = require('./sync-mixin');
var SimpleFilteredCollection = require('gitter-realtime-client/lib/simple-filtered-collection');

var SuggestedRoomsCollection = Backbone.Collection.extend({
  sync: SyncMixin.sync,
  fetchForUser: function() {
    this.url = apiClient.user.channel('/suggestedRooms');
    this.fetch();
  },

  fetchForRoom: function() {
    this.url = apiClient.room.channel('/suggestedRooms');
    this.fetch();
  },
});

/* Filters out any rooms the user is already in, provided in options.roomCollection */

var FilteredSuggestionsCollection = SimpleFilteredCollection.extend({
  constructor: function(underlyingOptions) {
    var roomsCollection = underlyingOptions.roomsCollection;
    delete underlyingOptions.roomsCollection;

    var underlyingCollection = new SuggestedRoomsCollection(null, underlyingOptions);

    SimpleFilteredCollection.prototype.constructor.call(this, [], {
      collection: underlyingCollection,
      filter: function(model) {
        return !roomsCollection.get(model.id);
      }
    });
  },

  fetchForUser: function() {
    this.getUnderlying().fetchForUser();
  },

  fetchForRoom: function() {
    this.getUnderlying().fetchForRoom();
  },
});

module.exports = {
  Collection: SuggestedRoomsCollection,
  Filtered: FilteredSuggestionsCollection,
};
