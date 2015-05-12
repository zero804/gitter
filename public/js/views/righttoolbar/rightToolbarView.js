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
var ActivityStream = require('./activity');
require('views/behaviors/isomorphic');

module.exports = (function() {

  var RightToolbarLayout = Marionette.LayoutView.extend({
    className: 'right-toolbar right-toolbar--collapsible',
    behaviors: {
      Isomorphic: {}
    },

    regions: {
      search: '#search-results',
      searchInput: '.js-search',
      repo_info: "#repo-info",
      activity: '#activity',
      roster: '#people-roster'
    },

    events: {
      'click #upgrade-auth': 'onUpgradeAuthClick',
      'click #people-header' : 'showPeopleList',
      'click #info-header' : 'showRepoInfo',
      'submit #upload-form': 'upload'
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

      // TODO: use a CompositeView and get rid of this stuff
      this.listenTo(itemCollections.events, 'add reset sync', function() {
        if (itemCollections.events.length) {
          this.$el.find('#activity-header').show();
          itemCollections.events.off('add reset sync', null, this);
        } else {
          if (context().permissions.admin) {
            this.$el.find('#activity-header').show();
          }
        }
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
      // TODO: use region events for this stuff......
      this.listenTo(searchView, 'search:expand', function () {
        // TODO: use this.UI
        this.$el.addClass('right-toolbar--expanded');
      });

      this.listenTo(searchView, 'search:collapse', function () {
        // TODO: use this.UI
        this.$el.removeClass('right-toolbar--expanded');
      });

      this.listenTo(searchView, 'search:show', function () {
        // TODO: use this.UI
        this.$el.find('#toolbar-top-content').hide();
        this.$el.find('#zendesk-footer').hide();
      });

      this.listenTo(searchView, 'search:hide', function () {
        // TODO: use this.UI
        this.$el.find('#toolbar-top-content').show();
        this.$el.find('#zendesk-footer').show();
      });

      return {
        search: searchView,
        searchInput: new SearchInputView(optionsForRegion('searchInput', { model: this.searchState })),
        repo_info: repoInfoView,
        activity: new ActivityStream(optionsForRegion('activity', { collection: itemCollections.events })),
        roster: new PeopleCollectionView.ExpandableRosterView(optionsForRegion('roster', {
          rosterCollection: itemCollections.roster
        }))
      };
    },

    showPeopleList: function() {
      this.$el.find('#repo-info').hide();
      this.$el.find('#people-roster').show();
      this.$el.find('#people-header').addClass('selected');
      this.$el.find('#info-header').removeClass('selected');
    },

    showRepoInfo: function() {
      this.$el.find('#people-roster').hide();
      this.$el.find('#repo-info').show();
      this.$el.find('#people-header').removeClass('selected');
      this.$el.find('#info-header').addClass('selected');
    }

  });

  return RightToolbarLayout;


})();
