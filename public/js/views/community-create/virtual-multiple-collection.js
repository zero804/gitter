'use strict';

var Backbone = require('backbone');

var VirtualMultipleCollection = Backbone.Collection.extend({
  initialize: function(models, options) {
    if (!options || !options.backingCollections) {
      throw new Error('A valid VirtualMultipleCollection must be passed an array of backbone collections');
    }

    this.add(models);

    this.backingCollections = options.backingCollections;
    this.backingCollections.forEach(function(backingCollection) {
      this.listenTo(backingCollection, 'reset', this.onCollectionReset, this);
      this.listenTo(backingCollection, 'sync', this.onCollectionSync, this);
      this.listenTo(backingCollection, 'snapshot', this.onCollectionSnapshot.bind(this, backingCollection), this);
      this.listenTo(backingCollection, 'remove', this.onItemRemoved, this);
      this.listenTo(backingCollection, 'add', this.onItemAdded, this);

      this.add(backingCollection.models);
    }.bind(this));
  },

  onItemAdded: function(model) {
    this.add(model);
  },
  onItemRemoved: function(model) {
    this.remove(model);
  },

  onCollectionReset: function(collection) {
    this.reset(collection.models || []);
    this.trigger('reset');
  },

  onCollectionSync: function(collection) {
    this.set(collection.models || []);
    this.trigger('sync');
  },

  onCollectionSnapshot: function(collection) {
    this.set(collection.models || []);
    this.trigger('snapshot');
  },
});

module.exports = VirtualMultipleCollection;
