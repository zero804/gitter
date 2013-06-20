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
  'hbs!./views/invite/tmpl/invitesItemTemplate',
  'hbs!./views/app/tmpl/appHeader',
  'components/webNotifications',
  'components/errorReporter',
  'filtered-collection'
], function($, _, Backbone, _backboneKeys, Marionette, _Helpers, TroupeViews, realtime, dozy, AppIntegratedView,
            troupeCollections, TroupeCollectionView, profileView,
            createTroupeView, invitesItemTemplate, headerViewTemplate,
            webNotifications /*, errorReporter , FilteredCollection */) {
  "use strict";

  $(document).on("click", "a", function(event) {
    if(this.href) {
      var href = $(this).attr('href');
      if(href.substring(0, 2) === "#|") {
        event.preventDefault();

        href = href.substring(2);

        var currentFragment;
        var hash = window.location.hash;

        if(!hash) {
          currentFragment = '#';
        } else {
          currentFragment = hash.split('|', 1)[0];
        }

        window.location = currentFragment + "|" + href;
      }
    }

    return true;
  });

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
  var appView = new AppIntegratedView({ app: app });

  function track(name) {
    $(document).trigger('track', name);
  }

  var Router = Backbone.Router.extend({
    initialize: function(/*options*/) {
      this.regionsFragments = {};
      this.route(/^(.*?)$/, "handle");
    },

    regionFragmentMapping: [
      'rightPanelRegion',
      'dialogRegion'
    ],

    getViewDetails: function(fragment) {

      var routes = [

        { name: "profile",        re: /^profile$/,                viewType: profileView.Modal },
        { name: "create",         re: /^create$/,                 viewType: createTroupeView.Modal, collection: troupeCollections.troupes,   skipModelLoad: true },
        { name: "troupeSettings", re: /^troupeSettings/,          viewType: troupeSettingsView }

      ];

      var match = null;
      _.any(routes, function(route) {
        if(route.re.test(fragment)) {
          match = route;
          return true;
        }
      });

      if(!match) return null;

      var result = match.re.exec(fragment);

      return {
        viewType: match.viewType,
        collection: match.collection,
        viewOptions: match.viewOptions,
        skipModelLoad: match.skipModelLoad ? match.skipModelLoad : /* If there is no collection, skipModelLoad=true */ !match.collection,
        name: match.name,
        id: result[1]
      };
    },

    handle: function(path) {
      var h = window.location.hash;
      if (h.indexOf('#%7C') === 0) {
        window.location.hash = h.replace(/%7C/, '|');
        path = path.replace(/%7C/, '|');
      }
      var parts = path ? path.split("|") : [];

      this.regionFragmentMapping.forEach(function(regionName, index) {
        var fragment = parts[index] ? parts[index] : "";

        if(fragment.substring(0, 1) === '#') {
          fragment = fragment.substring(1);
        }

        var region, viewDetails;

        function loadItemIntoView() {
          var model = viewDetails.skipModelLoad ? null : viewDetails.collection.get(viewDetails.id);
          var cv = region.currentView;

          if(viewDetails.collection) {
            if(cv instanceof viewDetails.viewType &&
              cv.supportsModelReplacement &&
              cv.supportsModelReplacement()) {
              cv.replaceModel(model);
              $(document).trigger('appNavigation');

              return;
            }
          }

          /* Default case: load the view from scratch */
          var viewOptions = _.extend({ model: model, collection: viewDetails.collection }, viewDetails.viewOptions);
          var view = new viewDetails.viewType(viewOptions);
          region.show(view);
          $(document).trigger('appNavigation');
        }

        if(this.regionsFragments[regionName] !== fragment) {
          this.regionsFragments[regionName] = fragment;

          region = app[regionName];

          if(fragment) {
            // lookup handler:
            viewDetails = this.getViewDetails(fragment);

            if(viewDetails) {
              track(viewDetails.name);

              // If we have a collection and we need to load a model item,
              // ensure that the collection has already been populated. If it
              // hasn't, wait until it has
              if(!viewDetails.skipModelLoad) {
                if(viewDetails.collection.length === 0) {
                  viewDetails.collection.once('reset', loadItemIntoView, this);
                  return;
                }
              }

              loadItemIntoView();
              return;
            } else {
              track('unknown');
            }
          }

          region.close();
        } else {
          // This hasn't changed....
        }
      }, this);
    }

  });

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
    var recentTroupeCollectionView = new TroupeCollectionView({
      collection: recentTroupeCollection
    });
    app.leftMenuRecent.show(recentTroupeCollectionView);

    // normal troupe view
    var troupeCollectionView = new TroupeCollectionView({
      collection: filteredTroupeCollection
    });
    app.leftMenuTroupes.show(troupeCollectionView);

    // one to one troupe view
    var oneToOneTroupeCollectionView = new TroupeCollectionView({
      collection: peopleOnlyTroupeCollection
    });
    app.leftMenuPeople.show(oneToOneTroupeCollectionView);

    // unread troupe view
    var unreadTroupeCollectionView = new TroupeCollectionView({
      collection: unreadTroupeCollection
    });
    app.leftMenuUnread.show(unreadTroupeCollectionView);

    // favourite troupe view
    var favouriteTroupeCollectionView = new TroupeCollectionView({
      collection: favouriteTroupesCollection
    });
    app.leftMenuFavourites.show(favouriteTroupeCollectionView);

    // incoming invites collection view
    var invitesCollectionView = new Marionette.CollectionView({
      collection: incomingInvitesCollection,
      itemView: TroupeViews.Base.extend({
        tagName: 'li',
        template: invitesItemTemplate
      })
    });
    app.leftMenuInvites.show(invitesCollectionView);

  });

  app.on("initialize:after", function(){
    router = new Router({});

    router.initialize();
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
