'use strict';

var BaseCollectionModel = require('../base-collection/base-collection-model');

module.exports = BaseCollectionModel.extend({

  onAll: function() {
    this.set({
      header: 'Your Suggestions',
      active: true,
    });
  },

  onSearch: function() {
    this.set({
      header: 'Chat Messages',
      active: true,
    });
  },

  onOrg: function() {
    this.set({
      header: 'All Rooms',
      active: true,
    });
  },

  onDefault: function() {
    this.set({
      header: ' ',
      active: false,
    });
  },
});
