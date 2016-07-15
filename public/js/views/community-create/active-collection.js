'use strict';

var Backbone = require('backbone');

var ActiveItemModel = Backbone.Model.extend({
  defaults: {
    active: false,
    hidden: false
  },
});

var ActiveCollection = Backbone.Collection.extend({
  model: ActiveItemModel,

  initialize: function(models, options) {
    if (!options || !options.collection) {
      throw new Error('A valid ActiveCollection must be passed to a new instance of a backbone collection');
    }

    this.backingCollection = options.collection;
    this.listenTo(this.backingCollection, 'request', this.onCollectionRequest, this);
    this.listenTo(this.backingCollection, 'reset', this.onCollectionReset, this);
    this.listenTo(this.backingCollection, 'sync', this.onCollectionSync, this);
    this.listenTo(this.backingCollection, 'snapshot', this.onCollectionSnapshot, this);
    this.listenTo(this.backingCollection, 'remove', this.onItemRemoved, this);
    this.listenTo(this.backingCollection, 'add', this.onItemAdded, this);

    this.addModels(models);
  },

  fetch: function() {
    return this.backingCollection.fetch.apply(this.backingCollection, arguments);
  },

  onItemAdded: function(model) {
    this.add(new ActiveItemModel(model.toJSON()));
  },
  onItemRemoved: function(model) {
    this.remove(model);
  },

  onCollectionRequest: function() {
    this.trigger('request');
  },

  onCollectionReset: function() {
    this.addModels(this.backingCollection.models);
    this.trigger('reset');
  },

  onCollectionSync: function() {
    this.addModels(this.backingCollection.models);
    this.trigger('sync');
  },

  onCollectionSnapshot: function() {
    this.addModels(this.backingCollection.models);
    this.trigger('snapshot');
  },

  addModels: function(models) {
    models = models || [];
    this.set(models.map(function(model) {
      return new ActiveItemModel(model.toJSON());
    }));
  }
});

module.exports = ActiveCollection;
