'use strict';

var BaseCollectionModel = require('../base-collection/base-collection-model');

module.exports = BaseCollectionModel.extend({

  constructor: function(attrs, options) {
    BaseCollectionModel.prototype.constructor.apply(this, arguments);
    this.collection = options.collection;

    this.listenTo(this.roomMenuModel, 'change:searchTerm', this.onModelChangePreState, this);
  },

  onModelChangePreState: function() {
    var active = false;

    switch (this.roomMenuModel.get('state')) {
      case 'search':
        active = !this.roomMenuModel.get('searchTerm');
        break;

      default:
        active = this.collection.length;
        break;
    }

    this.set('active', active);
  },

  onAll: function() {
    this.set({
      header:       'Your Organisations',
      active:       true,
      isSuggestion: false,
    });
  },

  onSearch: function() {
    this.set({
      header:       'Recent Searches',
      active:       true,
      isSuggestion: false,
    });
  },

  onOrg: function (){
    this.set({
      header:       'Your Suggestions',
      active:       !this.roomMenuModel.get('hasDismissedSuggestions'),
      isSuggestion: true
    });
  },

  onDefault: function() {
    this.set({
      header:       false,
      active:       false,
      isSuggestion: false,
    });
  },
});
