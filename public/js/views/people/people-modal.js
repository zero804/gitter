"use strict";
var Marionette = require('marionette');
var Backbone = require('backbone');
var _ = require('underscore');
var TroupeViews = require('views/base');
var itemTemplate = require('./tmpl/people-modal-result.hbs');
var apiClient = require('components/apiClient');
var template = require('./tmpl/people-modal.hbs');
var rosterCollection = require('collections/instances/integrated-items').roster;
var SyncMixin = require('collections/sync-mixin');
var InfiniteScrollBehavior = require('views/behaviors/infinite-scroll');
require('views/behaviors/widgets');

var RESULT_LIMIT = 25;

var UserCollection = Backbone.Collection.extend({
  searchTerm: '',
  limit: RESULT_LIMIT,
  url: apiClient.room.channelGenerator('/users'),
  sync: SyncMixin.sync,
  fetchMoreBefore: function() {},
  fetchMoreAfter: function() {
    // already fetching or no more results to fetch
    if (this.limit > this.length) return;

    this.limit = this.limit + 25;

    this.fetchWithLimit();
  },
  search: function(term) {
    this.searchTerm = term || '';
    // reset result limit for new search
    this.limit = RESULT_LIMIT;

    this.fetchWithLimit();
  },
  fetchWithLimit: function() {
    this.fetch({
      data: {
        limit: this.limit,
        q: this.searchTerm
      }
    });
  }
});

var UserView = Marionette.ItemView.extend({
  tagName: 'li',
  className: 'people-modal-result',
  template: itemTemplate,
  modelEvents: {
    change: 'render'
  },
  behaviors: {
    Widgets: {}
  }
});

var View = Marionette.CompositeView.extend({
  className: 'people-modal',
  template: template,
  ui: {
    search: 'input',
    results: 'ul'
  },
  itemViewContainer: '@ui.results',
  itemView: UserView,
  events: {
    'input @ui.search': 'debouncedSearch'
  },
  initialize: function() {
    var self = this;

    this.debouncedSearch = _.debounce(function() {
      var term = self.ui.search.val();
      self.collection.search(term);
    }, 250);

    this.once('render', function() {
      new InfiniteScrollBehavior({ scrollElement: this.ui.results[0] }, this);
    }, this);
  }
});

var Modal = TroupeViews.Modal.extend({
  initialize: function(options) {
    options = options || {};
    options.title = "People";

    var collection = new UserCollection(rosterCollection.models);
    collection.fetchWithLimit();

    TroupeViews.Modal.prototype.initialize.call(this, options);
    this.view = new View({ collection: collection });
  }
});

module.exports = Modal;
