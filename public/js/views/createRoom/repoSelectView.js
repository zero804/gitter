/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'marionette',
  'underscore',
  'backbone',
  'views/base',
  'collections/base',
  'hbs!./tmpl/repoSelectView',
  'hbs!./tmpl/repoItemView',
  'collections/repos',
  'cocktail',
  'views/controls/selectable-mixin',
  'views/controls/live-search',
  'filtered-collection' /* no ref */

], function(Marionette, _, Backbone, TroupeViews, TroupeCollections, template, itemTemplate, repoModels, cocktail, SelectableMixin, liveSearch) {
  "use strict";

  var FilteredLoadingCollection = Backbone.FilteredCollection.extend({ });
  cocktail.mixin(FilteredLoadingCollection, TroupeCollections.UnderlyingLoadingMixin);


  var ItemView = Marionette.ItemView.extend({
    template: itemTemplate,
    tagName: 'li',
    onRender: function() {
      this.el.dataset.cid = this.model.cid;
    }
  });

  var View = Marionette.CompositeView.extend({
    events: {
    },
    ui: {
      search: "input#search"
    },
    itemViewContainer: '#list',
    itemView: ItemView,
    template: template,
    constructor: function(options) {
      if(!options) options = {};
      if(!options.collection) {
        var underlying = new repoModels.ReposCollection({ });
        underlying.fetch();

        var c = new FilteredLoadingCollection(null, { model: repoModels.RepoModel, collection: underlying });
        c.setFilter(function(m) {
          return !m.get('room');
        });
        c.loading = true;

        options.collection = c;
      }

      return Marionette.CompositeView.call(this, options);
    },
    onRender: function() {
      liveSearch(this, this.ui.search, 'searchTextChanged', { shortDebounce: 50, longDebounce: 200 });
    },
    searchTextChanged: function(text) {
      this.collection.setFilter(function(m) {
        return !m.get('room') && m.get('name').indexOf(text) >= 0;
      });
    }
  });

  cocktail.mixin(View, TroupeViews.LoadingCollectionMixin, SelectableMixin, TroupeViews.SortableMarionetteView);

  return View;

});
