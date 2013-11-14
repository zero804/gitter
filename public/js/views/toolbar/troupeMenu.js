/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery',
  'underscore',
  'marionette',
  'collections/instances/troupes',
  'views/toolbar/troupeCollectionView',
  'hbs!views/toolbar/tmpl/troupeListItemEmpty',
  'hbs!views/toolbar/tmpl/privateTroupeListItemEmpty',
  'views/app/invitesView',
  'hbs!./tmpl/troupeMenu',
  './searchView',
  './profileView',
  'nanoscroller' //no ref
], function($, _, Marionette, troupeCollections, TroupeCollectionView, troupeListItemEmpty, privateTroupeListItemEmpty, InvitesView, template, SearchView, ProfileView) {
  "use strict";

  return Marionette.Layout.extend({
    template: template,
    tagName: 'span',
    selectedListIcon: "icon-troupes",

    regions: {
      profile: "#left-menu-profile",
      unread: "#left-menu-list-unread",
      invites: "#left-menu-list-invites",
      outgoingConnectionInvites: "#left-menu-list-outgoing-connection-invites",
      incomingConnectionInvites: "#left-menu-list-incoming-connection-invites",
      incomingTroupeInvites: "#left-menu-list-incoming-troupe-invites",
      recent: "#left-menu-list-recent",
      favs: "#left-menu-list-favourites",
      troupes: "#left-menu-list-troupes",
      people: "#left-menu-list-users",
      search: "#left-menu-list-search"
    },

    events: {
      "click #search-clear-icon" : "onSearchClearIconClick"
    },

    initialize: function() {
      this.initHideListeners = _.once(_.bind(this.initHideListeners, this));

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

      // normal troupe view
      this.troupes.show(new TroupeCollectionView({collection: troupeCollections.normalTroupes, emptyView: Marionette.ItemView.extend({ template: troupeListItemEmpty })}));

      // one to one troupe view
      this.people.show(new TroupeCollectionView({collection: troupeCollections.peopleTroupes, emptyView: Marionette.ItemView.extend({ template: privateTroupeListItemEmpty })}));

      // mega-list: recent troupe view
      this.recent.show(new TroupeCollectionView({ collection: troupeCollections.recentTroupes }));

      // mega-list: unread troupe view
      this.unread.show(new TroupeCollectionView({collection: troupeCollections.unreadTroupes }));

      // mega-list: favourite troupe view
      this.favs.show(new TroupeCollectionView({ collection: troupeCollections.favouriteTroupes }));

      // mega-list: incoming invites collection view
      this.invites.show(new InvitesView({ collection: troupeCollections.incomingInvites }));

      // incoming troupe invites view
      this.incomingTroupeInvites.show(new InvitesView({ collection: troupeCollections.incomingTroupeInvites }));

      // incoming connection invites view
      this.incomingConnectionInvites.show(new InvitesView({ collection: troupeCollections.incomingConnectionInvites }));

      // outgoing one-one invites view
      this.outgoingConnectionInvites.show(new InvitesView({ collection: troupeCollections.outgoingConnectionInvites, fromViewer: true }));

      // search results collection view
      this.searchView = new SearchView({ troupes: troupeCollections.troupes, $input: this.$el.find('#list-search-input') });
      this.search.show(this.searchView);

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
      toggler('#invitesList', troupeCollections.incomingInvites);
      toggler('#incomingTroupeInvites', troupeCollections.incomingTroupeInvites);
      toggler('#outgoingConnectionInvites', troupeCollections.outgoingConnectionInvites);
      toggler('#incomingConnectionInvites', troupeCollections.incomingConnectionInvites);

      function toggler(element, collection) {
        function toggle() {
          self.$el.find(element).toggle(collection.length > 0);
          self.$el.find('.nano').nanoScroller(/*{ preventPageScrolling: true }*/);
        }

        collection.on('all', toggle);
        toggle();
      }
    },

    activateSearchList: function() {
      this.$el.find('#list-search-input').focus();
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
