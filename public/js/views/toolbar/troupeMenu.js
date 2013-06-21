/*jshint unused:true, browser:true */
define([
  'underscore',
  'marionette',
  "nanoscroller",
  'collections/instances/troupes',
  'views/toolbar/troupeCollectionView',
  'views/app/invitesView',
  'hbs!./tmpl/troupeMenu'
], function(_, Marionette, _nano, troupeCollections, TroupeCollectionView, InvitesView, template) {
  "use strict";

  return Backbone.Marionette.Layout.extend({
    template: template,
    selectedListIcon: "icon-mega",

    regions: {
      unread: "#left-menu-list-unread",
      invites: "#left-menu-list-invites",
      recent: "#left-menu-list-recent",
      favs: "#left-menu-list-favourites",
      troupes: "#left-menu-list",
      people: "#left-menu-list-users",
      search: "#left-menu-list-search"
    },

    events: {
     "click .left-menu-icon":            "onLeftMenuListIconClick"
    },

    initialize: function() {
      this.initHideListeners = _.once(_.bind(this.initHideListeners, this));
    },

    onRender: function() {
      this.$el.find('.nano').nanoScroller({ preventPageScrolling: true });

      // recent troupe view
      this.recent.show(new TroupeCollectionView({ collection: troupeCollections.recentTroupes }));

      // normal troupe view
      this.troupes.show(new TroupeCollectionView({collection: troupeCollections.normalTroupes }));

      // one to one troupe view
      this.people.show(new TroupeCollectionView({collection: troupeCollections.peopleTroupes }));

      // unread troupe view
      this.unread.show(new TroupeCollectionView({collection: troupeCollections.unreadTroupes }));

      // favourite troupe view
      this.favs.show(new TroupeCollectionView({ collection: troupeCollections.favouriteTroupes }));

      // incoming invites collection view
      this.invites.show(new InvitesView({ collection: troupeCollections.incomingInvites }));

      this.initHideListeners();

    },

    initHideListeners: function() {
      var self = this;

      toggler('#unreadTroupesList', troupeCollections.unreadTroupes);
      toggler('#favTroupesList', troupeCollections.favouriteTroupes);
      toggler('#recentTroupesList', troupeCollections.recentTroupes);
      toggler('#invitesList', troupeCollections.incomingInvites);

      function toggler(element, collection) {
        function toggle() {
          console.log('Toggle ', collection, element,collection.length > 0);
          self.$el.find(element).toggle(collection.length > 0);
          self.$el.find('.nano').nanoScroller({ preventPageScrolling: true });
        }

        collection.on('all', toggle);
        toggle();
      }
    },

    onLeftMenuListIconClick: function(e) {
      var selected = $(e.target).attr('id');
      if(selected === this.selectedListIcon) return;

      // Turn off the old selected list
      var currentSelection = $("#"+this.selectedListIcon);
      currentSelection.removeClass('selected').fadeTo(100, 0.6);
      var listElement = currentSelection.data('list');

      $("#" + listElement).hide();

      // TODO: We probably want to destroy the list to remove the dom elements

      // enable the new selected list
      this.selectedListIcon = selected;
      var newSelection = $("#" + this.selectedListIcon);

      newSelection.addClass('selected');
      listElement = newSelection.data('list');

      $("#" + listElement).show();

      // TODO: Related to the above TODO, we probably only want to populate the list now

      if (this.selectedListIcon == 'icon-search') {
        this.activateSearchList();
      }

      this.$el.find('.nano').nanoScroller({ preventPageScrolling: true });

    }


  });


});
