'use strict';

var Backbone = require('backbone');
var localStorageSync = require('../utils/local-storage-sync');
var LimitedCollection = require('gitter-realtime-client/lib/limited-collection');

var MAX_SAVED_SEARCHES = 5;

var RecentSearchModel = Backbone.Model.extend({
  defaults: { name: null, avatarUrl: null, isRecentSearch: true },
});

var RecentSearchesCollection = Backbone.Collection.extend({
  model: RecentSearchModel,

  // Used by localStorageSync...
  cid: 'left-menu-saved-searches',

  comparator: function(a, b) {
    return b.get('time') - a.get('time');
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
    return this.models.sort(this.comparator).slice(0, MAX_SAVED_SEARCHES);
  },

  sync: localStorageSync.sync,
});

var FilteredRecentSearches = LimitedCollection.extend({
  model: RecentSearchModel,

  constructor: function() {
    var collection = new RecentSearchesCollection(null);

    LimitedCollection.prototype.constructor.call(this, [], {
      collection: collection,
      maxLength: MAX_SAVED_SEARCHES
    });
  },
});

module.exports = FilteredRecentSearches;
