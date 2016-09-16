'use strict';

var Marionette = require('backbone.marionette');
var ItemView = require('./category-item-view');

var CategoryCollectionView = Marionette.CollectionView.extend({
  tagName: 'ul',
  className: function() {
    console.log('CategoryCollectionView-className');
    return 'collection-list';
  },
  childView: ItemView
});


module.exports = CategoryCollectionView;
