/*jshint unused:true, browser:true*/
require([
  'jquery',
  'underscore',
  'backbone',
  'backbone.keys', // no ref
  'marionette',
  'template/helpers/all',
  'views/base',
  'components/realtime',
  'components/dozy',
  'views/app/appIntegratedView',
  'collections/instances/troupes',
  'views/toolbar/troupeCollectionView',
  'views/profile/profileView',
  'views/signup/createTroupeView',
  'views/app/invitesView',
  'hbs!./views/app/tmpl/appHeader',
  'components/webNotifications',
  'utils/router',
  'components/errorReporter',
  'filtered-collection'
], function($, _, Backbone, _backboneKeys, Marionette, _Helpers, TroupeViews, realtime, dozy, AppIntegratedView,
            troupeCollections, TroupeCollectionView, profileView,
            createTroupeView, InvitesView, headerViewTemplate,
            webNotifications, Router /*, errorReporter , FilteredCollection */) {
  "use strict";

  var app = new Marionette.Application();
  app.collections = {};
  app.addRegions({
    leftMenuUnread: "#left-menu-list-unread",
    leftMenuInvites: "#left-menu-list-invites",
    leftMenuRecent: "#left-menu-list-recent",
    leftMenuFavourites: "#left-menu-list-favourites",
    leftMenuTroupes: "#left-menu-list",
    leftMenuPeople: "#left-menu-list-users",
    leftMenuSearch: "#left-menu-list-search",
    rightPanelRegion: "#right-panel",
    headerRegion: "#header-region"
  });

  /* This is a special region which acts like a region, but is implemented completely differently */
  app.dialogRegion = {
    currentView: null,
    show: function(view) {
      if(this.currentView) {
        this.currentView.fade = false;
        this.currentView.hideInternal();
      }
      this.currentView = view;
      view.navigable = true;
      view.show();
    },
    close: function() {
      if(this.currentView) {
        this.currentView.navigationalHide();
        this.currentView = null;
      }
    }
  };

  var router;
  new AppIntegratedView({ app: app });

  // Troupe Collections
  var filteredTroupeCollection = troupeCollections.normalTroupes;
  var peopleOnlyTroupeCollection = troupeCollections.peopleTroupes;
  var unreadTroupeCollection = troupeCollections.unreadTroupes;
  var favouriteTroupesCollection = troupeCollections.favouriteTroupes;
  var recentTroupeCollection = troupeCollections.recentTroupes;
  var incomingInvitesCollection = troupeCollections.incomingInvites;

  app.addInitializer(function(/*options*/){

    var headerView = new (TroupeViews.Base.extend({
      template: headerViewTemplate,
      getRenderData: function() {
        return { user: window.troupeContext.user, troupeContext: troupeContext };
      }
    }))();

    app.headerRegion.show(headerView);

    $('#mail-list').hide();

    // add the troupe views to the left menu

    // recent troupe view
    app.leftMenuRecent.show(new TroupeCollectionView({ collection: recentTroupeCollection }));

    // normal troupe view
    app.leftMenuTroupes.show(new TroupeCollectionView({collection: filteredTroupeCollection }));

    // one to one troupe view
    app.leftMenuPeople.show(new TroupeCollectionView({collection: peopleOnlyTroupeCollection }));

    // unread troupe view
    app.leftMenuUnread.show(new TroupeCollectionView({collection: unreadTroupeCollection }));

    // favourite troupe view
    app.leftMenuFavourites.show(new TroupeCollectionView({ collection: favouriteTroupesCollection }));

    // incoming invites collection view
    app.leftMenuInvites.show(new InvitesView({ collection: incomingInvitesCollection }));

  });

  app.on("initialize:after", function(){
    router = new Router({
      routes: [
        { name: "profile",        re: /^profile$/,                viewType: profileView.Modal },
        { name: "create",         re: /^create$/,                 viewType: createTroupeView.Modal, collection: troupeCollections.troupes,   skipModelLoad: true }
      ],
      app: app
    });

    Backbone.history.start();
  });

  // Asynchronously load tracker
  require([
    'utils/tracking'
  ], function(/*tracking*/) {
    // No need to do anything here
  });


  app.start();
  window._troupeDebug = {
    app: app
  };

  return app;
});
