'use strict';

var PrimaryCollectionModel = require('../primary-collection/primary-collection-model');

module.exports = PrimaryCollectionModel.extend({

  onSearch: function(){
    this.set({
      active: false,
      header: false,
    });
  },

  onFavourite: function(){
    this.set({
      active: false,
      header: false,
    });
  }


});
