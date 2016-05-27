'use strict';
var apiClient = require('components/apiClient');
var Backbone = require('backbone');
var SyncMixin = require('./sync-mixin');
var _ = require('underscore');

var FilteredCollection = require('backbone-filtered-collection');

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

var FilteredSuggestionsCollection = function(underlyingOptions) {

  var roomsCollection = underlyingOptions.roomsCollection;
  delete underlyingOptions.roomsCollection;

  var underlyingCollection = this._underlyingCollection = new SuggestedRoomsCollection(null, underlyingOptions);

  var options = {
    collection: underlyingCollection,
  };

  FilteredCollection.call(this, options);

  this.setFilter(function(model) {
    return !roomsCollection.get(model.id);
  });
};

FilteredSuggestionsCollection.prototype = _.extend(
FilteredSuggestionsCollection.prototype,
FilteredCollection.prototype, {

  fetchForUser: function() {
    this._underlyingCollection.fetchForUser();
  },

  fetchForRoom: function() {
    this._underlyingCollection.fetchForRoom();
  },
});

module.exports = {
  Collection: SuggestedRoomsCollection,
  Filtered: FilteredSuggestionsCollection,
};
