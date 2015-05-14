"use strict";
var Backbone = require('backbone');
var Marionette = require('backbone.marionette');
var context = require('utils/context');
var itemCollections = require('collections/instances/integrated-items');
var PeopleCollectionView = require('views/people/peopleCollectionView');
var SearchView = require('views/search/searchView');
var SearchInputView = require('views/search/search-input-view');
var RepoInfoView = require('./repoInfo');
var RepoInfoModel = require('collections/repo-info');
var ActivityCompositeView = require('./activityCompositeView');
var hasScrollBars = require('utils/scrollbar-detect');
require('views/behaviors/isomorphic');

module.exports = (function() {

  var RightToolbarLayout = Marionette.LayoutView.extend({
    className: 'right-toolbar right-toolbar--collapsible',
    behaviors: {
      Isomorphic: {}
    },

    ui: {
      header: '#toolbar-top-content',
      footer: '#zendesk-footer',
      rosterHeader: '#people-header',
      repoInfoHeader: '#info-header'
    },

    regions: {
      search: '#search-results',
      searchInput: '.js-search',
      repo_info: "#repo-info",
      activity: '#activity-region',
      roster: '#people-roster'
    },

    events: {
      'click #upgrade-auth':  'onUpgradeAuthClick',
      'click #people-header': 'showPeopleList',
      'click #info-header':   'showRepoInfo',
      'submit #upload-form':  'upload'
    },

    childEvents: {
      'search:expand': 'expandSearch',
      'search:collapse': 'collapseSearch',
      'search:show': 'showSearch',
      'search:hide': 'hideSearch'
    },

    toggleSearch: function () {
      // hide all regions and show/hide search...
    },

    initialize: function () {
      // Search
      this.searchState = new Backbone.Model({
        searchTerm: '',
        active: false,
        isLoading: false
      });

    },

    initRegions: function(optionsForRegion) {
      // Repo info
      var repoInfoView;
      if (context.troupe().get('githubType') === 'REPO') {
        var repo = new RepoInfoModel();
        repo.fetch({ data: { repo: context.troupe().get('uri') } });

        repoInfoView = new RepoInfoView(optionsForRegion('repo_info', { model: repo }));
      }

      var searchView = new SearchView(optionsForRegion('search', { model: this.searchState }));
      var oneToOne = context.inOneToOneTroupeContext();

      return {
        search: searchView,
        searchInput: new SearchInputView(optionsForRegion('searchInput', { model: this.searchState })),
        repo_info: repoInfoView,
        activity: oneToOne ? null : new ActivityCompositeView(optionsForRegion('activity', { collection: itemCollections.events })),
        roster: new PeopleCollectionView.ExpandableRosterView(optionsForRegion('roster', {
          rosterCollection: itemCollections.roster
        }))
      };
    },

    onRender: function() {
      if (hasScrollBars()) {
        this.activity.$el.addClass("scroller");
      }
    },

    expandSearch: function() {
      this.$el.addClass('right-toolbar--expanded');
    },

    collapseSearch: function() {
      this.$el.removeClass('right-toolbar--expanded');
    },

    showSearch: function() {
      this.search.$el.show();
      this.ui.header.hide();
      this.ui.footer.hide();
    },

    hideSearch: function() {
      this.search.$el.hide();
      this.ui.header.show();
      this.ui.footer.show();
    },

    showPeopleList: function() {
      this.repo_info.$el.hide();
      this.roster.$el.show();
      this.ui.rosterHeader.addClass('selected');
      this.ui.repoInfoHeader.removeClass('selected');
    },

    showRepoInfo: function() {
      this.roster.$el.hide();
      this.repo_info.$el.show();
      this.ui.rosterHeader.removeClass('selected');
      this.ui.repoInfoHeader.addClass('selected');
    }

  });

  return RightToolbarLayout;


})();
