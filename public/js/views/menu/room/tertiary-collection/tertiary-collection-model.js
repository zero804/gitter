'use strict';

var BaseCollectionModel = require('../base-collection/base-collection-model');

module.exports = BaseCollectionModel.extend({
  onAll: function() {
    this.set({
      header:       'Your Organisations',
      active:       true,
      isSuggestion: false,
    });
  },

  onSearch: function() {
    console.log('ON SEARCH');
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
