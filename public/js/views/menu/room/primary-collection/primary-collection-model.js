'use strict';

var BaseCollectionModel = require('../base-collection/base-collection-model');

module.exports = BaseCollectionModel.extend({


  constructor: function(attrs, options) {
    BaseCollectionModel.prototype.constructor.apply(this, arguments);
    this.collection = options.collection;
    this.listenTo(this.roomMenuModel, 'change:searchTerm', this.onSearch, this);
  },

  onSearch: function() {
    this.set({
      header: 'Rooms & People',
      active: !!this.roomMenuModel.get('searchTerm'),
    });
  },

  onFavourite: function(){
    this.set({
      header: false
    });
  },

  onPeople: function() {
    this.set({
      header: false
    });
  },

  onDefault: function() {
    this.set({
      header: false,
      active: !!this.collection.length && !!this.collection.models.length,
    });
  },
});
