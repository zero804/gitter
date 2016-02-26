'use strict';

var Backbone            = require('backbone');
var _                   = require('underscore');
var FilteredCollection  = require('backbone-filtered-collection');
var backboneUrlResolver = require('backbone-url-resolver');
var SyncMixin           = require('./sync-mixin');

var SuggestedCollection = Backbone.Collection.extend({
  initialize: function(models, attrs) {//jshint unused: true

    if (!attrs || !attrs.contextModel) {
      throw new Error('A valid model must be passed to SuggestedOrgCollection when initialized');
    }

    this.contextModel = attrs.contextModel;
    this.urlModel     = backboneUrlResolver('/v1/orgs/:selectedOrgName/suggestedRooms', this.contextModel);
    this.listenTo(this.contextModel, 'change:selectedOrgName', this.onOrgNameUpdate, this);
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

var FilteredSuggestedCollection = function() {
  FilteredCollection.apply(this, arguments);
};

FilteredSuggestedCollection.prototype = _.extend(
  FilteredSuggestedCollection.prototype,
  FilteredCollection.prototype, {

  constructor: function(models, attrs) {

    this.collection       = new SuggestedCollection(models, attrs);
    this.roomCollection   = attrs.roomCollection;
    this.collectionFilter = this.collectionFilter.bind(this);
    var options           = _.extend({}, attrs, { collection: this.collection });

    this.listenTo(this.roomCollection, 'update', this.onCollectionSync, this);

    FilteredCollection.prototype.constructor.call(this, null, options);
  },

  collectionFilter: function(model) {
    return !this.roomCollection.get(model.get('id'));
  },

  onCollectionSync: function() {
    this.setFilter();
  },

});

module.exports = FilteredSuggestedCollection;
