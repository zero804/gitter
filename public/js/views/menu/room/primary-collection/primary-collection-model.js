'use strict';

var BaseCollectionModel = require('../base-collection/base-collection-model');

module.exports = BaseCollectionModel.extend({

  onSearch: function() {
    this.set({
      header: 'Rooms & People',
      active: true,
    });
  },

  onDefault: function() {
    this.set({
      header: false,
      active: true,
    });
  },
});
