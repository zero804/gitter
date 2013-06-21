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
      unread: "#left-menu-list-unread",
      invites: "#left-menu-list-invites",
      recent: "#left-menu-list-recent",
      favs: "#left-menu-list-favourites",
      troupes: "#left-menu-list",
      people: "#left-menu-list-users",
      search: "#left-menu-list-search"
    },

    initialize: function() {
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
    }
  });


});
