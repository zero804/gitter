'use strict';

var BaseCollectionModel = require('../base-collection/base-collection-model');

module.exports = BaseCollectionModel.extend({

  onAll: function() {
    this.set({
      header:       'Your Suggestions',
      isSuggestion: true,
      active: !!this.collection.length &&
        !!this.collection.models.length &&
        !this.roomMenuModel.get('hasDismissedSuggestions'),
    });
  },

  onSearch: function() {
    this.set({
      header: 'Chat Messages',
      isSuggestion: false,
      active: !!this.roomMenuModel.get('searchTerm'),
    });
  },

  onOrg: function() {
    this.set({
      header: 'All Rooms',
      isSuggestion: false,
      active: !!this.collection.length &&
        !!this.collection.models.length,
    });
  },

  onDefault: function() {
    this.set({
      header:       false,
      isSuggestion: false,
      active: !!this.collection.length && !!this.collection.models.length
    });
  },

});
