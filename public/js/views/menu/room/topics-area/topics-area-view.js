'use strict';

var Marionette = require('backbone.marionette');
var CategoryCollectionView = require('./category-collection-view');

var template = require('./topics-area-view.hbs');

require('../../../behaviors/isomorphic');

var TopicsAreaView = Marionette.LayoutView.extend({
  className: function() {
    console.log('TopicsAreaView-className');
    return 'left-menu-topics-area-inner';
  },
  template: template,

  behaviors: {
    Isomorphic: {
      topicsCategoryList: { el: '.js-left-menu-topics-category-list-root', init: 'initCategoryCollectionView' },
    },
  },

  initCategoryCollectionView: function(optionsForRegion) {
    console.log('initCategoryCollectionView');
    return new CategoryCollectionView(optionsForRegion({
      collection: this.collection
    }));
  },

  initialize: function() {
    console.log('TopicsAreaView');
  },

  onRender: function() {
    console.log('TopicsAreaView-render', this.el);
  }

});


module.exports = TopicsAreaView;
