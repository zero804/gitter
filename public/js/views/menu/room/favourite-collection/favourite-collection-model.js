'use strict';

var PrimaryCollectionModel = require('../primary-collection/primary-collection-model');

module.exports = PrimaryCollectionModel.extend({


  constructor: function(attrs, options) {
    PrimaryCollectionModel.prototype.constructor.apply(this, arguments);
    this.collection = options.collection;
  },

  onModelChangePreState: function() {
    var active = false;

    switch (this.roomMenuModel.get('state')) {
      default:
        // We use `collection.models.length` vs `collection.length`
        active = !!this.collection.models.length;
        break;
    }

    // TODO, see why this isn't showing the correct number of filtered favourites in the views
    console.log('onModelChangePreState', active, this.collection.length, this.collection.models.length, this.collection.models, this);
    this.set('active', active);
  },

  onSearch: function(){
    this.set({
      active: false,
      header: false,
    });
  },

  onFavourite: function(){
    this.set({
      active: true,
      header: false,
    });
  }


});
