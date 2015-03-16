"use strict";
var Marionette = require('backbone.marionette');
var Backbone = require('backbone');
var TroupeViews = require('views/base');
var loadingMixins = require('collections/loading-mixins');
var template = require('./tmpl/repoSelectView.hbs');
var itemTemplate = require('./tmpl/repoItemView.hbs');
var emptyTemplate = require('./tmpl/repoEmptyView.hbs');
var repoModels = require('collections/repos');
var cocktail = require('cocktail');
var SelectableMixin = require('views/controls/selectable-mixin');
var liveSearch = require('views/controls/live-search');
var dataset = require('utils/dataset-shim');
require('filtered-collection');

module.exports = (function() {


  // TODO: put this somewhere else
  var FilteredLoadingCollection = Backbone.FilteredCollection.extend({ });
  cocktail.mixin(FilteredLoadingCollection, loadingMixins.UnderlyingLoadingMixin);

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
    onRender: function() {
      this.childViewContainer = this.$el.find('#list');
      liveSearch(this, this.ui.search, 'searchTextChanged', { shortDebounce: 50, longDebounce: 200 });
    },
    searchTextChanged: function(text) {
      this.collection.setFilter(function(m) {
        return m.get('name').indexOf(text) >= 0;
      });
    }
  });

  View.createCollection = function()  {
    var underlying = new repoModels.ReposCollection();
    underlying.fetch();

    var c = new FilteredLoadingCollection(null, { model: repoModels.RepoModel, collection: underlying });
    c.setFilter(function() {
      return true;
    });

    return c;
  };

  cocktail.mixin(View, TroupeViews.LoadingCollectionMixin, SelectableMixin);

  return View;


})();
