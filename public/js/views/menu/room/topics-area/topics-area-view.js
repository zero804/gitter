'use strict';

var Marionette = require('backbone.marionette');
var CategoryCollectionView = require('./category-collection-view');

var template = require('./topics-area-view.hbs');

require('../../../behaviors/isomorphic');

var TopicsAreaView = Marionette.LayoutView.extend({
  className: 'left-menu-topics-area-inner',
  template: template,


  behaviors: {
    Isomorphic: {
      topicsCategoryList: { el: '.js-left-menu-topics-category-list-root', init: 'initCategoryCollectionView' },
    },
  },

  initCategoryCollectionView: function(optionsForRegion) {
    return new CategoryCollectionView(optionsForRegion({
      collection: this.collection
    }));
  },

  initialize: function() {

  },

});


module.exports = TopicsAreaView;
