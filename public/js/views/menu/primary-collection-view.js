'use strict';

var Marionette   = require('backbone.marionette');
var itemTemplate = require('./tmpl/primary-collection-item-view.hbs');

var ItemView = Marionette.ItemView.extend({
  template: itemTemplate,
});

module.exports = Marionette.CollectionView.extend({
  childView: ItemView,
  initialize: function (){
    this.listenTo(this.collection, 'collection:change', this.render, this);
  },
});
