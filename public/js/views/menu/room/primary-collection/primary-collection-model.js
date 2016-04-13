'use strict';

var BaseCollectionModel = require('../base-collection/base-collection-model');

module.exports = BaseCollectionModel.extend({


  constructor: function(attrs, options) {
    BaseCollectionModel.prototype.constructor.apply(this, arguments);

    this.listenTo(this.roomMenuModel, 'change:searchTerm', this.onModelChangePreState, this);
  },

  onModelChangePreState: function() {
    var active = false;

    switch (this.roomMenuModel.get('state')){
      case 'search':
        active = !!this.roomMenuModel.get('searchTerm');
        break;
      default:
        active = true;
        break;

    }

    this.set('active', active);
  },

  onSearch: function() {
    this.set({
      header: 'Rooms & People',
      active: true,
    });
  },

  onFavourite: function(){
    this.set({
      header: false,
      active: false
    });
  },

  onDefault: function() {
    this.set({
      header: false,
      active: true,
    });
  },
});
