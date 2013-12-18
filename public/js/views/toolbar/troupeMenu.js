/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery',
  'underscore',
  'marionette',
  'utils/context',
  'collections/instances/troupes',
  'views/toolbar/troupeCollectionView',
  'hbs!views/toolbar/tmpl/privateTroupeListItemEmpty',
  'hbs!./tmpl/troupeMenu',
  './searchView',
  './profileView',
  './orgCollectionView',
  './repoCollectionView',
  'nanoscroller' //no ref
], function($, _, Marionette, context, troupeCollections, TroupeCollectionView, privateTroupeListItemEmpty, template, SearchView, ProfileView, OrgCollectionView, RepoCollectionView) {
  "use strict";

  return Marionette.Layout.extend({
    template: template,
    tagName: 'span',
    selectedListIcon: "icon-troupes",

    regions: {
      profile: "#left-menu-profile",
      unread: "#left-menu-list-unread",
      recent: "#left-menu-list-recent",
      favs: "#left-menu-list-favourites",
      people: "#left-menu-list-users",
      search: "#left-menu-list-search",
      orgs: "#left-menu-list-orgs",
      repos: "#left-menu-list-repos"
    },

    events: {
      "click #search-clear-icon" : "onSearchClearIconClick",
      "click #left-menu-profile" : "onClickProfileMenu",
      "click #left-menu-repo-section" : "toggleRepoList",
      "click #left-menu-users-section" : "togglePrivateChatList"
    },

    initialize: function() {
      this.initHideListeners = _.once(_.bind(this.initHideListeners, this));
      this.repoList = false;
      var ua = navigator.userAgent.toLowerCase();
      if (ua.indexOf('gitter/') >= 0) {
        this.isGitterApp = true;
      }
      var self = this;
      $(window).on('showSearch', function() {
        self.showSearch();
      });
      $(window).on('hideSearch', function() {
        self.hideSearch();
      });
    },

    onRender: function() {

      this.profile.show(new ProfileView());

      // one to one troupe view
      this.people.show(new TroupeCollectionView({collection: troupeCollections.peopleTroupes, emptyView: Marionette.ItemView.extend({ template: privateTroupeListItemEmpty })}));

      // mega-list: recent troupe view
      this.recent.show(new TroupeCollectionView({ collection: troupeCollections.recentTroupes }));

      // mega-list: unread troupe view
      this.unread.show(new TroupeCollectionView({collection: troupeCollections.unreadTroupes }));

      // mega-list: favourite troupe view
      this.favs.show(new TroupeCollectionView({ collection: troupeCollections.favouriteTroupes }));

      // search results collection view
      this.searchView = new SearchView({ troupes: troupeCollections.troupes, $input: this.$el.find('#list-search-input') });
      this.search.show(this.searchView);

      // Organizations collection view
      this.orgs.show(new OrgCollectionView({ collection: troupeCollections.orgs }));

      // Repositories collection view
      this.repos.show(new RepoCollectionView({ collection: troupeCollections.repos }));


      this.initHideListeners();
    },

    onSearchClearIconClick: function() {
      $('#list-search-input').val('');
      this.hideSearch();
    },

    initHideListeners: function() {
      var self = this;
      toggler('#unreadTroupesList', troupeCollections.unreadTroupes);
      toggler('#favTroupesList', troupeCollections.favouriteTroupes);
      toggler('#recentTroupesList', troupeCollections.recentTroupes);
      toggler('#UsersList', troupeCollections.peopleTroupes);
      function toggler(element, collection) {
        function toggle() {
          self.$el.find(element).toggle(collection.length > 0);
          self.$el.find('.nano').nanoScroller();
        }

        collection.on('all', toggle);
        toggle();
      }
    },

    toggleRepoList: function() {
      if (this.repoList) {
        $("#left-menu-list-repos").slideUp("fast", function () {
          $("#repo-toggle").text("SHOW");
        });
        this.repoList = false;
      }
      else {
        $("#left-menu-list-repos").slideDown("fast" , function() {
          $("#repo-toggle").text("HIDE");
        });
        this.repoList = true;
      }
    },

    togglePrivateChatList: function() {
      if (this.privateChatList) {
        $("#left-menu-list-users").slideUp("fast", function () {
          $("#users-toggle").text("SHOW");
        });
        this.privateChatList = false;
      }
      else {
        $("#left-menu-list-users").slideDown("fast" , function() {
          $("#users-toggle").text("HIDE");
        });
        this.privateChatList = true;
      }
    },

    activateSearchList: function() {
      this.$el.find('#list-search-input').focus();
    },

    onClickProfileMenu: function() {
      if (this.isGitterApp) {
        window.location.href = "/" + context.getUser().username;
        return;
      }

      $('#left-menu-profile').toggleClass('active');
      $('#left-menu-scroll').toggleClass('pushed');
    },

    hideSearch: function() {
      this.$el.find('#list-search').hide();
      this.$el.find('#list-mega').show();
    },

    showSearch: function() {
      this.$el.find('#list-mega').hide();
      this.$el.find('#list-search').show();
    },

  });


});
