'use strict';

var Backbone = require('backbone');
var _ = require('underscore');
var FilteredCollection = require('backbone-filtered-collection');
var backboneUrlResolver = require('backbone-url-resolver');
var SyncMixin = require('./sync-mixin');

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
    this.urlModel = backboneUrlResolver('/v1/orgs/:selectedOrgName/suggestedRooms', this.contextModel);
    this.listenTo(this.contextModel, 'change:selectedOrgName', this.onOrgNameUpdate, this);

    var selectedOrg = this.contextModel.get('selectedOrgName');
    var orgIsSelected = selectedOrg && selectedOrg.length > 0;
    if(this.contextModel.get('state') === 'org' && orgIsSelected) {
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

var FilteredSuggestedCollection = function(attrs, options) {
  this.collection = new SuggestedCollection(null, attrs, options);
  this.roomCollection = attrs.roomCollection;
  this.collectionFilter = this.collectionFilter.bind(this);
  attrs = _.extend({}, attrs, { collection: this.collection });

  this.listenTo(this.roomCollection, 'update', this.onCollectionSync, this);

  FilteredCollection.call(this, attrs, options);
};

FilteredSuggestedCollection.prototype = _.extend(
  FilteredSuggestedCollection.prototype,
  FilteredCollection.prototype, {

  collectionFilter: function(model) {
    return !this.roomCollection.get(model.get('id'));
  },

  onCollectionSync: function() {
    this.setFilter();
  },

});

module.exports = FilteredSuggestedCollection;
