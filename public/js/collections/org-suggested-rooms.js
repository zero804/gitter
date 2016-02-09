'use strict';

var Backbone            = require('backbone');
var _                   = require('underscore');
var FilteredCollection  = require('filtered-collection');
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

module.exports = Backbone.FilteredCollection.extend({

  constructor: function(models, attrs) {

    this.collection       = new SuggestedCollection(models, attrs);
    this.roomCollection   = attrs.roomCollection;
    this.collectionFilter = this.collectionFilter.bind(this);
    var options           = _.extend({}, attrs, { collection: this.collection });

    this.listenTo(this.roomCollection, 'update', this.onCollectionSync, this);

    Backbone.FilteredCollection.prototype.constructor.call(this, null, options);
  },

  collectionFilter: function (model){
    return !this.roomCollection.get(model.get('id'));
  },

  onCollectionSync: function (){
    this.setFilter();
  },

});
