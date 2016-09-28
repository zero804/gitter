'use strict';

var Marionette = require('backbone.marionette');
var ItemView = require('./category-item-view');
var domIndexById = require('../../../../utils/dom-index-by-id');

var CategoryCollectionView = Marionette.CollectionView.extend({
  tagName: 'ul',
  className: function() {
    return 'collection-list';
  },
  childView: ItemView,

  childViewOptions: function(model) {
    var id = model.get('id');
    var element = this.domMap[id];
    return {
      el: element
    };
  },

  onBeforeRender: function() {
    this.domMap = domIndexById(this.el);
  },
});


module.exports = CategoryCollectionView;
