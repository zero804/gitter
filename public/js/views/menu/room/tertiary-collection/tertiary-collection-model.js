'use strict';

var BaseCollectionModel = require('../base-collection/base-collection-model');

module.exports = BaseCollectionModel.extend({

  constructor: function(attrs, options) {
    BaseCollectionModel.prototype.constructor.apply(this, arguments);
    this.collection = options.collection;

    this.listenTo(this.collection, 'sync', this.updateModelActiveState, this);
    this.listenTo(this.roomMenuModel, 'change:searchTerm', this.updateModelActiveState, this);
  },

  onAll: function() {
    this.set({
      header:       'Your Organisations',
      isSuggestion: false,
    });
  },

  onSearch: function() {
    this.set({
      header:       'Recent Searches',
      isSuggestion: false,
      active: !this.roomMenuModel.get('searchTerm'),
    });
  },

  onOrg: function (){
    this.set({
      header:       'Your Suggestions',
      isSuggestion: true,
      active: !!this.collection.length && !this.roomMenuModel.get('hasDismissedSuggestions'),
    });
  },

  onDefault: function() {
    this.set({
      header:       false,
      isSuggestion: false,
    });
  },
});
