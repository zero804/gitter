'use strict';

var BaseCollectionModel = require('../base-collection/base-collection-model');

module.exports = BaseCollectionModel.extend({
  onAll: function() {
    console.log('setting your orgs');
    this.set({
      header: 'Your Organisations',
      active: true,
    });
  },

  onSearch: function() {
    this.set({
      header: 'Recent Searches',
      active: true,
    });
  },

  onOrg: function (){
    this.set({
      header: 'Your Suggestions',
      active: true
    });
  },

  onDefault: function() {
    this.set({
      header: false,
      active: false,
    });
  },
});
