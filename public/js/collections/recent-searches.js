'use strict';

var Backbone = require('backbone');
var localStorageSync = require('../utils/local-storage-sync');
var LimitedCollection = require('gitter-realtime-client/lib/limited-collection');

var Model = Backbone.Model.extend({
  defaults: { name: null, avatarUrl: null, isRecentSearch: true },
});

var RecentSearchesCollection = Backbone.Collection.extend({

  model: Model,

  comparator: function(a, b) {
    return a.get('time') - b.get('time');
  },

  add: function(model) {
    var prev = this.findWhere({ name: model.name });
    if (prev) { return prev.set('time', +new Date());}

    if (!model.name) { return; }

    model.time = +new Date();
    Backbone.Collection.prototype.add.apply(this, arguments);
  },

  set: function() {
    Backbone.Collection.prototype.set.apply(this, arguments);
    this.sync('create', this);
  },

  //Limit the number of entries saved into local storage
  toJSON: function() {
    return this.models.sort(this.comparator).slice(0, 5);
  },

  sync: localStorageSync.sync,
});


var FilteredRecentSearches = LimitedCollection.extend({
  model: Model,

  constructor: function() {
    var collection = new RecentSearchesCollection(null);

    LimitedCollection.prototype.constructor.call(this, [], {
      collection: collection,
      maxLength: 5
    });
  },
  //
  // add: function() {
  //   this._collection.add.apply(this.collection, arguments);
  //   // this.collection.sort();
  //   // this.setFilter();
  // },
  //
  // remove: function() {
  //   this._collection.remove.apply(this.collection, arguments);
  //   // this.collection.sort();
  //   // this.setFilter();
  // },
  //
  // reset: function() {
  //   this._collection.reset.apply(this.collection, arguments);
  //   // this.collection.sort();
  //   // this.setFilter();
  // },
});
//
//
// var FilteredRecentSearches = function(attrs, options) {
//   attrs = _.extend({}, attrs, { collection: this.collection });
//   FilteredCollection.call(this, attrs, options);
// };
//
// FilteredRecentSearches.prototype = _.extend(
//   FilteredRecentSearches.prototype,
//   FilteredCollection.prototype, {
//
//   collectionFilter: function(model, index) { //jshint unused: true
//     return (index < 5);
//   },
//
//   comparator: function(a, b) {
//     return a.get('time') < b.get('time') ? 1 : -1;
//   },
//
//   add: function() {
//     this.collection.add.apply(this.collection, arguments);
//     // this.collection.sort();
//     // this.setFilter();
//   },
//
//   remove: function() {
//     this.collection.remove.apply(this.collection, arguments);
//     // this.collection.sort();
//     // this.setFilter();
//   },
//
//   reset: function() {
//     this.collection.reset.apply(this.collection, arguments);
//     // this.collection.sort();
//     // this.setFilter();
//   },
// });

module.exports = FilteredRecentSearches;
