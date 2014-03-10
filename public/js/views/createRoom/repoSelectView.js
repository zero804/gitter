/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'marionette',
  'backbone',
  'views/base',
  'hbs!./tmpl/repoSelectView',
  'hbs!./tmpl/repoItemView',
  'collections/repos',
  'cocktail',
  'views/controls/selectable-mixin',
  'views/controls/live-search',
  'filtered-collection' /* no ref */

], function(Marionette, Backbone, TroupeViews, template, itemTemplate, repoModels, cocktail, SelectableMixin, liveSearch) {
  "use strict";

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
    initialize: function() {
      var underlying = new repoModels.ReposCollection({ });
      underlying.fetch();

      var c = new Backbone.FilteredCollection(null, { model: repoModels.RepoModel, collection: underlying });
      c.setFilter(function(m) {
        return !m.get('room');
      });

      this.collection = c;
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

  cocktail.mixin(View, SelectableMixin, TroupeViews.SortableMarionetteView, TroupeViews.LoadingCollectionMixin);

  return View;

});
