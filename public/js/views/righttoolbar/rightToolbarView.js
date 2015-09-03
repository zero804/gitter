"use strict";
var Backbone = require('backbone');
var Marionette = require('backbone.marionette');
var context = require('utils/context');
var itemCollections = require('collections/instances/integrated-items');
var PeopleCollectionView = require('views/people/peopleCollectionView');
var SearchView = require('views/search/searchView');
var SearchInputView = require('views/search/search-input-view');
var RepoInfoView = require('./repoInfo');
var ActivityCompositeView = require('./activityCompositeView');
var hasScrollBars = require('utils/scrollbar-detect');
require('views/behaviors/isomorphic');

module.exports = (function() {

  var RightToolbarLayout = Marionette.LayoutView.extend({
    className: 'right-toolbar right-toolbar--collapsible',
    behaviors: {
      Isomorphic: {
        search: { el: '#search-results', init: 'initSearchRegion' },
        header: { el: '#right-toolbar-header-region', init: 'initSearchInputRegion' },
        repo_info: { el: '#repo-info', init: 'initRepo_infoRegion' },
        activity: { el: '#activity-region', init: 'initActivityRegion' },
        roster: { el: '#people-roster', init: 'initRosterRegion' },
      }
    },

    ui: {
      header: '#toolbar-top-content',
      footer: '#zendesk-footer',
      rosterHeader: '#people-header',
      repoInfoHeader: '#info-header'
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

      this.listenTo(context.troupe(), 'change:id', this.onRoomChange, this);

    },

    initSearchRegion: function(optionsForRegion) {
      return new SearchView(optionsForRegion({ model: this.searchState }));
    },

    initSearchInputRegion: function(optionsForRegion) {
      return new SearchInputView(optionsForRegion({ model: this.searchState }));
    },

    initRepo_infoRegion: function(optionsForRegion) {
      // Repo info
      if (context.troupe().get('githubType') !== 'REPO') return;
      return new RepoInfoView(optionsForRegion());
    },

    initActivityRegion: function(optionsForRegion, region) {
      if (hasScrollBars()) {
        region.$el.addClass("scroller");
      }

      var oneToOne = context.inOneToOneTroupeContext();

      return oneToOne ? null : new ActivityCompositeView(optionsForRegion({
        collection: itemCollections.events
      }));
    },

    initRosterRegion: function(optionsForRegion) {
      return new PeopleCollectionView.ExpandableRosterView(optionsForRegion({
        rosterCollection: itemCollections.roster
      }));
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
    },

    onRoomChange: function (model){
      if(model.get('githubType') === 'REPO'){
        this.$el.find('#info-header').show();
      }
      else {
        this.$el.find('#info-header').hide();
      }
    }

  });

  return RightToolbarLayout;


})();
