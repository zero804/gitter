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
    this.set({
      header:       'Recent Searches',
      active:       true,
      isSuggestion: false,
    });
  },

  onOrg: function (){
    this.set({
      header:       'Your Suggestions',
      active:       true,
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
