'use strict';

var PrimaryCollectionModel = require('../primary-collection/primary-collection-model');

module.exports = PrimaryCollectionModel.extend({


  constructor: function(attrs, options) {
    PrimaryCollectionModel.prototype.constructor.apply(this, arguments);
    this.collection = options.collection;
  },

  updateModelActiveState: function() {
    // We use `collection.models.length` and `collection.length` just to
    // play nice with proxycollections which don't seem to adjust `.length` appropriately
    var active = !!this.collection.length && !!this.collection.models.length;

    switch (this.roomMenuModel.get('state')) {
      case 'search':
        active = false;
        break;
    }

    //console.log('favourite-collection-model--updateModelActiveState', active, this.collection.length, this.collection.models.length, this.collection.models, this);
    this.set('active', active);
  },

  onSearch: function(){
    this.set({
      header: false
    });
  },

  onFavourite: function(){
    this.set({
      header: false
    });
  }


});
