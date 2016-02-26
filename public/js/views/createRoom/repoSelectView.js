"use strict";

var Marionette                = require('backbone.marionette');
var Backbone                  = require('backbone');
var loadingFilteredCollection = require('collections/loading-filtered-collection');
var template                  = require('./tmpl/repoSelectView.hbs');
var itemTemplate              = require('./tmpl/repoItemView.hbs');
var emptyTemplate             = require('./tmpl/repoEmptyView.hbs');
var repoModels                = require('collections/repos');
var cocktail                  = require('cocktail');
var SelectableMixin           = require('views/controls/selectable-mixin');
var LoadingCollectionMixin    = require('views/loading-mixin');
var liveSearch                = require('views/controls/live-search');
var dataset                   = require('utils/dataset-shim');

var FilteredCollection = require('backbone-filtered-collection');



var ItemView = Marionette.ItemView.extend({
  template: itemTemplate,
  tagName: 'li',
  onRender: function() {
    dataset.set(this.el, 'cid', this.model.cid);
  }
});

var EmptyView = Marionette.ItemView.extend({
  template: emptyTemplate,
  tagName: 'li'
});

var View = Marionette.CompositeView.extend({
  events: {
  },
  ui: {
    search: "input#search"
  },
  childView: ItemView,
  emptyView: EmptyView,
  template: template,
  childViewContainer: '#list',
  onRender: function() {
    liveSearch(this, this.ui.search, 'searchTextChanged', { shortDebounce: 50, longDebounce: 200 });
  },
  searchTextChanged: function(text) {
    this.collection.setFilter(function(m) {
      return m.get('name').indexOf(text) >= 0;
    });
  }
});

cocktail.mixin(View, LoadingCollectionMixin, SelectableMixin);

var createCollection = function()  {
  var underlying = new repoModels.ReposCollection();
  underlying.fetch();

  var c = new FilteredCollection(null, { model: repoModels.RepoModel, collection: underlying });
  // Trigger loading/loaded triggers on the filtered collection
  loadingFilteredCollection(c);
  c.setFilter(function() {
    return true;
  });

  return c;
};

module.exports = {
  View: View,
  createCollection: createCollection,
};
