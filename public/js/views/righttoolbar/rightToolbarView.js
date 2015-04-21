"use strict";
var $ = require('jquery');
var Backbone = require('backbone');
var Marionette = require('marionette');
var context = require('utils/context');
var itemCollections = require('collections/instances/integrated-items');
var PeopleCollectionView = require('views/people/peopleCollectionView');
var SearchView = require('views/search/searchView');
var SearchInputView = require('views/search/search-input-view');
var RepoInfoView = require('./repoInfo');
var RepoInfoModel = require('collections/repo-info');
var ActivityStream = require('./activity');

module.exports = (function() {


  var RightToolbarLayout = Marionette.Layout.extend({

    regions: {
      search: '#search-results',
      repo_info: "#repo-info"
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
      // People View
      new PeopleCollectionView.ExpandableRosterView({
        rosterCollection: itemCollections.roster,
        userCollection: itemCollections.sortedUsers,
        el: $('#people-roster')
      });

      // Repo info
      if (context.troupe().get('githubType') === 'REPO') {
        var repo = new RepoInfoModel();
        repo.fetch({ data: { repo: context.troupe().get('uri') } });
        
        this.repo_info.show(new RepoInfoView({ model: repo }));
      }

      // Activity
      new ActivityStream({
        el: $('#activity'),
        collection: itemCollections.events
      });

      // Search
      var searchState = new Backbone.Model({
        searchTerm: '',
        active: false,
        isLoading: false
      });

      new SearchInputView({
        el: $('.js-search'),
        model: searchState
      }).render();

      var searchView = new SearchView({
        el: $('#search-results'),
        model: searchState
      }).render();

      searchView.on('search:expand', function () {
        $('.right-toolbar').addClass('right-toolbar--expanded');
      });

      searchView.on('search:collapse', function () {
        $('.right-toolbar').removeClass('right-toolbar--expanded');
      });

      searchView.on('search:show', function () {
        $('#toolbar-top-content').hide();
        $('#zendesk-footer').hide();
      }.bind(this));

      searchView.on('search:hide', function () {
        $('#toolbar-top-content').show();
        $('#zendesk-footer').show();
      }.bind(this));

      itemCollections.events.on('add reset sync', function() {

        if (itemCollections.events.length >0) {
          this.$el.find('#activity-header').show();
          itemCollections.events.off('add reset sync', null, this);
        } else {
          if (context().permissions.admin) {
            this.$el.find('#activity-header').show();
          }

        }
      }, this);
    },

    showPeopleList: function() {
      $('#repo-info').hide();
      $('#people-roster').show();
      $('#people-header').addClass('selected');
      $('#info-header').removeClass('selected');
    },

    showRepoInfo: function() {
      $('#people-roster').hide();
      $('#repo-info').show();
      $('#people-header').removeClass('selected');
      $('#info-header').addClass('selected');
    }

  });

  return RightToolbarLayout;


})();
