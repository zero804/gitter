'use strict';

var BaseCollectionModel = require('../base-collection/base-collection-model');

module.exports = BaseCollectionModel.extend({


  constructor: function(attrs, options) {
    BaseCollectionModel.prototype.constructor.apply(this, arguments);
    this.collection = options.collection;

    this.listenTo(this.roomMenuModel, 'change:searchTerm', this.updateModelActiveState, this);
  },

  updateModelActiveState: function() {
    // We use `collection.models.length` and `collection.length` just to
    // play nice with proxycollections which don't seem to adjust `.length` appropriately
    var defaultActive = !!this.collection.length && !!this.collection.models.length;
    var active = defaultActive;

    switch (this.roomMenuModel.get('state')){
      case 'all':
        active = defaultActive && !this.roomMenuModel.get('hasDismissedSuggestions');
        break;

      case 'search':
        active = !!this.roomMenuModel.get('searchTerm');
        break;

      case 'favourite':
        active = defaultActive && !this.roomMenuModel.get('hasDismissedSuggestions');
        break;
    }

    this.set('active', active);
  },

  onAll: function() {
    this.set({
      header:       'Your Suggestions',
      isSuggestion: true,
    });
  },

  onSearch: function() {
    this.set({
      header: 'Chat Messages',
      isSuggestion: false,
    });
  },

  onFavourite: function(){
    this.set({
      header:       'Your Suggestions',
      isSuggestion: true,
    });
  },

  onOrg: function() {
    this.set({
      header:       'All Rooms',
      isSuggestion: false,
    });
  },

  onDefault: function() {
    this.set({
      header:       false,
      isSuggestion: false,
    });
  },










});
