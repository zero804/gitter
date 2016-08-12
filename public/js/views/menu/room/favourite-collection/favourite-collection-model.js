'use strict';

var PrimaryCollectionModel = require('../primary-collection/primary-collection-model');

module.exports = PrimaryCollectionModel.extend({

  onSearch: function(){
    this.set({
      header: false,
      active: false
    });
  },

});
