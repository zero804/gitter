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
  "nanoscroller" // No ref!
], function($, _, Marionette, troupeCollections, TroupeCollectionView, troupeListItemEmpty, privateTroupeListItemEmpty, InvitesView, template, SearchView) {
  "use strict";

  return Marionette.Layout.extend({
    template: template,
    tagName: 'span',
    selectedListIcon: "icon-troupes",
    serializeData: function() { return { compactView: window._troupeCompactView }; },

    regions: {
      unread: "#left-menu-list-unread",
      invites: "#left-menu-list-invites",
      outgoingConnectionInvites: "#left-menu-list-outgoing-connection-invites",
      incomingConnectionInvites: "#left-menu-list-incoming-connection-invites",
      incomingTroupeInvites: "#left-menu-list-incoming-troupe-invites",
      recent: "#left-menu-list-recent",
      favs: "#left-menu-list-favourites",
      troupes: "#left-menu-list",
      people: "#left-menu-list-users",
      search: "#left-menu-list-search"
    },

    events: {
      "click .left-menu-icon":    "onLeftMenuListIconClick",
      "mouseenter .left-menu-icon":       "onMouseEnterToolbarItem",
      "mouseleave .left-menu-icon":       "onMouseLeaveToolbarItem"
    },

    initialize: function() {
      this.initHideListeners = _.once(_.bind(this.initHideListeners, this));

      var self = this;
      $(window).on('showSearch', function() {
        self.showSearch();
      });
    },

    onRender: function() {
      this.$el.find('.nano').nanoScroller(/*{ preventPageScrolling: true }*/);

      // normal troupe view
      this.troupes.show(new TroupeCollectionView({collection: troupeCollections.normalTroupes, emptyView: Marionette.ItemView.extend({ template: troupeListItemEmpty })}));

      // one to one troupe view
      this.people.show(new TroupeCollectionView({collection: troupeCollections.peopleTroupes, emptyView: Marionette.ItemView.extend({ template: privateTroupeListItemEmpty })}));

      if (window._troupeCompactView) {
        // mega-list: recent troupe view
        this.recent.show(new TroupeCollectionView({ collection: troupeCollections.recentTroupes }));

        // mega-list: unread troupe view
        this.unread.show(new TroupeCollectionView({collection: troupeCollections.unreadTroupes }));

        // mega-list: favourite troupe view
        this.favs.show(new TroupeCollectionView({ collection: troupeCollections.favouriteTroupes }));

        // mega-list: incoming invites collection view
        this.invites.show(new InvitesView({ collection: troupeCollections.incomingInvites }));
      }

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

      var self = this;
      if (!window._troupeCompactView) {
        self.showTab('icon-troupes');
      }

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
          self.toggleMegaList();
        }

        collection.on('all', toggle);
        toggle();
      }
    },

    toggleMegaList: function() {
      if (window._troupeCompactView) {
        var c = troupeCollections;
        var invisibile = (c.unreadTroupes.length === 0 && c.favouriteTroupes.length === 0 && c.recentTroupes.length === 0 && c.incomingInvites.length === 0);

        var icon = this.$el.find('#icon-mega');
        if (invisibile) {
          icon.hide();
          if (!this.selectedListIcon || this.selectedListIcon === 'icon-mega') {
            this.showTab('icon-troupes');
          }
        }
        else {
          icon.show();
          this.showTab('icon-mega');
        }
      }
    },

    onLeftMenuListIconClick: function(e) {
      var selected = $(e.target).attr('id');
      this.showTab(selected);
    },

    showTab: function(selected) {
      // make sure focus is on the search box (even if the tab was already open)
      if (this.selectedListIcon == 'icon-search') {
        this.activateSearchList();
      }

      // just in case the on mouse over event wasn't run
      this.onMouseEnterToolbarItem({ target: this.$el.find('#' + selected) });

      // if the tab was already open do nothing
      if(selected === this.selectedListIcon) return;

      // Turn off the old selected list
      var currentSelection = this.$el.find("#"+this.selectedListIcon);
      currentSelection.removeClass('selected').fadeTo(100, 0.6);
      var listElement = currentSelection.data('list');

      this.$el.find("#" + listElement).hide();

      // TODO: We probably want to destroy the list to remove the dom elements

      // enable the new selected list
      this.selectedListIcon = selected;
      var newSelection = this.$el.find("#" + this.selectedListIcon);

      newSelection.addClass('selected');
      listElement = newSelection.data('list');

      this.$el.find("#" + listElement).show();

      // TODO: Related to the above TODO, we probably only want to populate the list now

      // make sure focus is on the search box (must be done now as well, after the elements are actually displayed)
      if (this.selectedListIcon == 'icon-search') {
        this.activateSearchList();
      }

      this.$el.find('.nano').nanoScroller(/*{ preventPageScrolling: true }*/);
    },

    activateSearchList: function() {
      this.$el.find('#list-search-input').focus();
    },

    showSearch: function() {
      this.showTab('icon-search');
    },

    onMouseEnterToolbarItem: function(e) {
      $(e.target).fadeTo(100, 1.0);
    },

    onMouseLeaveToolbarItem: function(e) {
      if ($(e.target).hasClass('selected')) return true;

      $(e.target).fadeTo(100, 0.6);
    }


  });


});
