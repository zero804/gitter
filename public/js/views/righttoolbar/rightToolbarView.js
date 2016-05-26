"use strict";
var Backbone = require('backbone');
var Marionette = require('backbone.marionette');
var context = require('utils/context');
var itemCollections = require('collections/instances/integrated-items');
var PeopleCollectionView = require('views/people/peopleCollectionView');
var RepoInfoView = require('./repoInfo');
var ActivityCompositeView = require('./activityCompositeView');

var SearchView = require('views/search/searchView');
var SearchInputView = require('views/search/search-input-view');

require('views/behaviors/isomorphic');

module.exports = (function() {

  var RightToolbarLayout = Marionette.LayoutView.extend({
    className: 'right-toolbar right-toolbar--collapsible',
    behaviors: {
      Isomorphic: {
        search:    { el: '#search-results', init: 'initSearchRegion' },
        header:    { el: '#right-toolbar-header-region', init: 'initSearchInputRegion' },
        repo_info: { el: '#repo-info', init: 'initRepo_infoRegion' },
        activity:  { el: '#activity-region', init: 'initActivityRegion' },
        roster:    { el: '#people-roster', init: 'initRosterRegion' },
      }
    },

    ui: {
      header:         '#toolbar-top-content',
      footer:         '#zendesk-footer',
      rosterHeader:   '#people-header',
      repoInfoHeader: '#info-header'
    },

    events: {
      'click #upgrade-auth':  'onUpgradeAuthClick',
      'click #people-header': 'showPeopleList',
      'click #info-header':   'showRepoInfo',
      'submit #upload-form':  'upload'
    },

    childEvents: {
      'search:expand':   'expandSearch',
      'search:collapse': 'collapseSearch',
      'search:show':     'showSearch',
      'search:hide':     'hideSearch'
    },

    collectionEvents: {
      'add sync reset remove': 'onCollectionUpdate'
    },

    toggleSearch: function () {
      // hide all regions and show/hide search...
    },

    constructor: function (){
      this.collection = itemCollections.roster;
      Marionette.LayoutView.prototype.constructor.apply(this, arguments);
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

    initRepo_infoRegion: function(optionsForRegion) {
      // Repo info
      return new RepoInfoView(optionsForRegion());
    },

    initActivityRegion: function(optionsForRegion) {
      return new ActivityCompositeView(optionsForRegion({
        collection: itemCollections.events
      }));
    },

    initRosterRegion: function(optionsForRegion) {
      return new PeopleCollectionView.ExpandableRosterView(optionsForRegion({
        rosterCollection: itemCollections.roster
      }));
    },

    initSearchRegion: function(optionsForRegion) {
      if(!context.hasFeature('left-menu')) { return new SearchView(optionsForRegion({ model: this.searchState })); }
    },

    initSearchInputRegion: function(optionsForRegion) {
      if(!context.hasFeature('left-menu')) { return new SearchInputView(optionsForRegion({ model: this.searchState })); }
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
      var roomType = model.get('githubType');
      var repoInfoHeader = this.$el.find('#info-header');
      var isNotRepo = (roomType !== 'REPO');

      //hide the 'REPO INFO' tab if we are not in a repo room
      repoInfoHeader.toggleClass('hidden', isNotRepo);

      //move back to the people list if we are showing repo info for a non repo room
      if(repoInfoHeader.hasClass('selected') && isNotRepo){
        this.showPeopleList();
      }
    },

    onCollectionUpdate: function (){
      var peopleList = this.$el.find('#people-list');
      peopleList.toggleClass('hidden', !this.collection.length);
    },

  });

  return RightToolbarLayout;


})();
