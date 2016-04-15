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
    var active = !!this.collection.length && !!this.collection.models.length;

    switch (this.roomMenuModel.get('state')){
      case 'search':
        active = !!this.roomMenuModel.get('searchTerm');
        break;

      case 'Favourite':
        active = false;
        break;
    }

    //console.log('primary-collection-model--updateModelActiveState', active, this.collection.length, this.collection.models.length, this.collection.models, this);
    this.set('active', active);
  },

  onSearch: function() {
    this.set({
      header: 'Rooms & People'
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
      header: false
    });
  },
});
