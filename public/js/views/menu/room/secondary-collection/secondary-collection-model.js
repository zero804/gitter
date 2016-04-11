'use strict';

var BaseCollectionModel = require('../base-collection/base-collection-model');

module.exports = BaseCollectionModel.extend({

  onAll: function() {
    this.set({
      header:       'Your Suggestions',
      active:       !this.roomMenuModel.get('hasDismissedSuggestions'),
      isSuggestion: true,
    });
  },

  onSearch: function() {
    this.set({
      header: 'Chat Messages',
      active: true,
      isSuggestion: false,
    });
  },

  onFavourite: function(){
    this.set({
      header:       'Your Suggestions',
      active:       !this.roomMenuModel.get('hasDismissedSuggestions'),
      isSuggestion: true,
    });
  },

  onOrg: function() {
    this.set({
      header:       'All Rooms',
      active:       true,
      isSuggestion: false,
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
