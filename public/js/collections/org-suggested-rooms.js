'use strict';

var Backbone            = require('backbone');
var _                   = require('underscore');
var FilteredCollection  = require('backbone-filtered-collection');
var backboneUrlResolver = require('backbone-url-resolver');
var SyncMixin           = require('./sync-mixin');

var SuggestedCollection = Backbone.Collection.extend({
  initialize: function(attrs) {//jshint unused: true

    if (!attrs || !attrs.contextModel) {
      throw new Error('A valid model must be passed to SuggestedOrgCollection when initialized');
    }

    this.contextModel = attrs.contextModel;
    this.roomCollection = attrs.roomCollection;
    this.urlModel     = backboneUrlResolver('/v1/orgs/:selectedOrgName/suggestedRooms', this.contextModel);
    this.listenTo(this.contextModel, 'change:selectedOrgName', this.onOrgNameUpdate, this);

    if(!!this.roomCollection.findWhere({ name: this.contextModel.get('selectedOrgName')})){
      this.fetch({ reset: true });
    }

  },

  url: function() {
    return this.urlModel.get('url');
  },

  onOrgNameUpdate: function(model, val) {//jshint unused: true
    if (!val || val  === '') return;
    this.fetch({ reset: true });
  },

  sync: SyncMixin.sync,
});

var FilteredSuggestedCollection = function(attrs, options) {
  this.collection       = new SuggestedCollection(attrs, options);
  this.roomCollection   = attrs.roomCollection;
  this.collectionFilter = this.collectionFilter.bind(this);
  attrs                 = _.extend({}, attrs, { collection: this.collection });

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
