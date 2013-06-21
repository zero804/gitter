/*jshint unused:true, browser:true */
define([
  'marionette',
  'collections/instances/troupes',
  'views/toolbar/troupeCollectionView',
  'views/app/invitesView'
], function(Marionette, troupeCollections, TroupeCollectionView, InvitesView) {
  "use strict";

  return Backbone.Marionette.Layout.extend({
    el: '#left-menu',

    regions: {
      leftMenuUnread: "#left-menu-list-unread",
      leftMenuInvites: "#left-menu-list-invites",
      leftMenuRecent: "#left-menu-list-recent",
      leftMenuFavourites: "#left-menu-list-favourites",
      leftMenuTroupes: "#left-menu-list",
      leftMenuPeople: "#left-menu-list-users",
      leftMenuSearch: "#left-menu-list-search"
    },

    initialize: function() {
      // Troupe Collections
      var filteredTroupeCollection = troupeCollections.normalTroupes;
      var peopleOnlyTroupeCollection = troupeCollections.peopleTroupes;
      var unreadTroupeCollection = troupeCollections.unreadTroupes;
      var favouriteTroupesCollection = troupeCollections.favouriteTroupes;
      var recentTroupeCollection = troupeCollections.recentTroupes;
      var incomingInvitesCollection = troupeCollections.incomingInvites;

      // recent troupe view
      this.leftMenuRecent.show(new TroupeCollectionView({ collection: recentTroupeCollection }));

      // normal troupe view
      this.leftMenuTroupes.show(new TroupeCollectionView({collection: filteredTroupeCollection }));

      // one to one troupe view
      this.leftMenuPeople.show(new TroupeCollectionView({collection: peopleOnlyTroupeCollection }));

      // unread troupe view
      this.leftMenuUnread.show(new TroupeCollectionView({collection: unreadTroupeCollection }));

      // favourite troupe view
      this.leftMenuFavourites.show(new TroupeCollectionView({ collection: favouriteTroupesCollection }));

      // incoming invites collection view
      this.leftMenuInvites.show(new InvitesView({ collection: incomingInvitesCollection }));
    }
  });


});
