'use strict';

var Backbone = require('backbone');
var backboneUrlResolver = require('backbone-url-resolver');
var SyncMixin = require('./sync-mixin');
var SimpleFilteredCollection = require('gitter-realtime-client/lib/simple-filtered-collection');

var Model = Backbone.Model.extend({
  defaults: {
    isSuggestion: true
  }
});

var SuggestedCollection = Backbone.Collection.extend({
  model: Model,

  initialize: function(models, attrs) { //jshint unused: true

    if (!attrs || !attrs.contextModel) {
      throw new Error('A valid model must be passed to SuggestedOrgCollection when initialized');
    }

    this.contextModel = attrs.contextModel;
    this.roomCollection = attrs.roomCollection;
    this.urlModel = backboneUrlResolver('/v1/groups/:groupId/suggestedRooms', this.contextModel);
    this.listenTo(this.contextModel, 'change:groupId', this.onOrgNameUpdate, this);

    if(this.contextModel.get('state') === 'org') {
      this.fetch({ reset: true });
    }

  },

  url: function() {
    return this.urlModel.get('url');
  },

  onOrgNameUpdate: function(model, val) {//jshint unused: true
    if (!val || val === '') return;
    //clear any old models
    this.reset([]);
    this.fetch({ reset: true });
  },

  sync: SyncMixin.sync,
});

var FilteredSuggestionsCollection = SimpleFilteredCollection.extend({
  constructor: function(options) {
    var collection = new SuggestedCollection(null, options);
    var roomCollection = options.roomCollection;

    SimpleFilteredCollection.prototype.constructor.call(this, [], {
      collection: collection,
      filter: function(model) {
        return !roomCollection.get(model.get('id'));
      }
    });

    this.listenTo(roomCollection, 'update', function() {
      this.setFilter();
    });
  },

});

module.exports = FilteredSuggestionsCollection;
