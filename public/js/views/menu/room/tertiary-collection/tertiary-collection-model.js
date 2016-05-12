'use strict';

var BaseCollectionModel = require('../base-collection/base-collection-model');

module.exports = BaseCollectionModel.extend({

  constructor: function(attrs, options) {
    BaseCollectionModel.prototype.constructor.apply(this, arguments);
    this.collection = options.collection;

    this.listenTo(this.collection, 'sync', this.updateModelActiveState, this);
    this.listenTo(this.roomMenuModel, 'change:searchTerm', this.updateModelActiveState, this);
  },

  updateModelActiveState: function() {
    // We use `collection.models.length` and `collection.length` just to
    // play nice with proxycollections which don't seem to adjust `.length` appropriately
    var active = !!this.collection.length && !!this.collection.models.length;

    switch (this.roomMenuModel.get('state')) {
      case 'search':
        active = !this.roomMenuModel.get('searchTerm');
        break;

      case 'org':
        active = !!this.collection.length && !this.roomMenuModel.get('hasDismissedSuggestions');
        break;
    }

    this.set('active', active);
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
    });
  },

  onOrg: function (){
    this.set({
      header:       'Your Suggestions',
      isSuggestion: true
    });
  },

  onDefault: function() {
    this.set({
      header:       false,
      isSuggestion: false,
    });
  },
});
