'use strict';

var Backbone           = require('backbone');
var _                  = require('underscore');
var FilteredCollection = require('filtered-collection');
var localStorageSync   = require('../utils/local-storage-sync');

var Model = Backbone.Model.extend({
  defaults: { name: null, avatarUrl: null },
});

var RecentSearchesCollection = Backbone.Collection.extend({

  model: Model,

  constructor: function() {
    Backbone.Collection.prototype.constructor.apply(this, arguments);
  },

  initialize: function() {
    this.cid = 'left-menu-saved-searches';
    this.fetch();
  },

  comparator: function(a, b) {
    return a.get('time') < b.get('time') ? 1 : -1;
  },

  add: function(model) {
    console.log(model, this.toJSON());
    var prev = this.findWhere({ name: model.name });
    if (prev) {
      console.log('in check');
      return prev.set('time', +new Date());}

    if (!model.name) { return; }

    model.time = +new Date();
    Backbone.Collection.prototype.add.apply(this, arguments);
  },

  set: function() {
    Backbone.Collection.prototype.set.apply(this, arguments);
    this.sync('create', this);
  },

  //Limit the number of entries saved into local storage
  toJSON: function (){
    return this.models.sort(this.comparator).slice(0, 5);
  },

  sync: localStorageSync.sync,
});

module.exports = Backbone.FilteredCollection.extend({
  constructor: function(models, attrs) {
    this.collection = new RecentSearchesCollection(models);
    var options = _.extend({}, attrs, { collection: this.collection });
    Backbone.FilteredCollection.prototype.constructor.call(this, null, options);
  },

  initialize: function(models, attrs) { //jshint unused: true
    var options = _.extend({}, attrs, { collection: this.collection });
    Backbone.FilteredCollection.prototype.initialize.call(this, null, options);
  },

  collectionFilter: function(model, index) { //jshint unused: true
    return (index < 5);
  },

  comparator: function(a, b) {
    return a.get('time') < b.get('time') ? 1 : -1;
  },

  add: function() {
    this.collection.add.apply(this.collection, arguments);
    this.collection.sort();
    this.setFilter();
  },

  remove: function() {
    this.collection.remove.apply(this.collection, arguments);
    this.collection.sort();
    this.setFilter();
  },

  reset: function() {
    this.collection.reset.apply(this.collection, arguments);
    this.collection.sort();
    this.setFilter();
  },
});
