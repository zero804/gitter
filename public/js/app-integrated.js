/*jshint unused:true, browser:true*/
require([
  'jquery',
  'underscore',
  'backbone',
  'marionette',
  'template/helpers/all',
  'views/base',
  'components/realtime',
  'components/eyeballs',
  'components/dozy',
  'views/app/appIntegratedView',
  'views/chat/chatInputView',
  'views/chat/chatCollectionView',
  'views/file/fileView',
  'views/conversation/conversationView',
  'views/request/requestView',
  'collections/desktop',
  'collections/troupes',
  'collections/files',
  'collections/conversations',
  'collections/users',
  'collections/chat',
  'collections/requests',
  'views/file/fileDetailView',
  'views/file/filePreviewView',
  'views/file/fileVersionsView',
  'views/request/requestDetailView',
  'views/people/personDetailView',
  'views/conversation/conversationDetailView',
  'views/toolbar/troupeCollectionView',
  'views/people/peopleCollectionView',
  'views/profile/profileView',
  'views/share/shareView',
  'views/signup/createTroupeView',
  'hbs!./views/app/tmpl/appHeader',
  'views/share/shareView',
  'views/app/troupeSettingsView',
  'components/webNotifications',
  'components/unread-items-client',
  'log!app-integrated',
  'components/errorReporter',
  'filtered-collection'
], function($, _, Backbone, Marionette, _Helpers, TroupeViews, realtime, eyeballs, dozy, AppIntegratedView, ChatInputView, ChatCollectionView, FileView, ConversationView, RequestView,
            collections, troupeModels, fileModels, conversationModels, userModels, chatModels, requestModels, FileDetailView, filePreviewView, fileVersionsView,
            RequestDetailView, PersonDetailView, conversationDetailView, TroupeCollectionView, PeopleCollectionView, profileView, shareView,
            createTroupeView, headerViewTemplate, shareTroupeView,
            troupeSettingsView, webNotifications, unreadItemsClient, log /*, errorReporter , FilteredCollection */) {
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

  // Make drop down menus drop down
  $(document).on("click", ".trpButtonDropdown .trpButtonMenu", function(/*event*/) {
    $(this).parent().next().toggle();
  });

  var app = new Marionette.Application();
  app.collections = {};
  app.addRegions({
    leftMenuUnread: "#left-menu-list-unread",
    leftMenuRecent: "#left-menu-list-recent",
    leftMenuFavourites: "#left-menu-list-favourites",
    leftMenuTroupes: "#left-menu-list",
    leftMenuPeople: "#left-menu-list-users",
    leftMenuSearch: "#left-menu-list-search",
    peopleRosterRegion: "#people-roster",
    fileRegion: "#file-list",
    mailRegion: ".frame-conversations",
    requestRegion: "#request-roster",
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
        { name: "request",        re: /^request\/(\w+)$/,         viewType: RequestDetailView,            collection: collections.requests },
        { name: "file",           re: /^file\/(\w+)$/,            viewType: FileDetailView,               collection: collections.files },
        { name: "filePreview",    re: /^file\/preview\/(\w+)$/,   viewType: filePreviewView.Modal,        collection: collections.files },
        { name: "fileVersions",   re: /^file\/versions\/(\w+)$/,  viewType: fileVersionsView.Modal,       collection: collections.files },
        { name: "mail",           re: /^mail\/(\w+)$/,            viewType: conversationDetailView.Modal, collection: collections.conversations },
        { name: "person",         re: /^person\/(\w+)$/,          viewType: PersonDetailView,             collection: collections.users },

        { name: "profile",        re: /^profile$/,                viewType: profileView.Modal },
        { name: "share",          re: /^share$/,                  viewType: shareView.Modal },
        { name: "create",         re: /^create$/,                 viewType: createTroupeView.Modal,       collection: collections.troupe,   skipModelLoad: true },
        { name: "shareTroupe",    re: /^shareTroupe/,             viewType: shareTroupeView.Modal },
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
      var parts = path.split("|");

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
          var view = new viewDetails.viewType({ model: model, collection: viewDetails.collection });
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

  // reference collections
  var chatCollection = collections.chats;
  var requestCollection = collections.requests;
  var fileCollection = collections.files;
  var conversationCollection = collections.conversations;
  // Troupe Collections
  var userCollection = collections.users;
  var troupeCollection = collections.troupes;
  var filteredTroupeCollection = collections.normalTroupes;
  var peopleOnlyTroupeCollection = collections.peopleTroupes;
  var unreadTroupeCollection = collections.unreadTroupes;
  var favouriteTroupesCollection = collections.favouriteTroupes;
  var recentTroupeCollection = collections.recentTroupes;
  // TODO is this used by anyone anymore?
  app.collections['chats'] = collections.chats;
  app.collections['requests'] = collections.requests;
  app.collections['files'] = collections.files;
  app.collections['conversations'] = collections.conversations;
  app.collections['users'] = collections.users;
  app.collections['troupes'] = collections.troupes;
  app.collections['recentTroupes'] = collections.recentTroupes;
  app.collections['unreadTroupes'] = collections.unreadTroupes;
  app.collections['favouriteTroupes'] = collections.favouriteTroupes;

  app.addInitializer(function(/*options*/){

    var headerView = new (TroupeViews.Base.extend({
      template: headerViewTemplate,
      getRenderData: function() {
        return { user: window.troupeContext.user, troupeContext: troupeContext };
      }
    }))();

    app.headerRegion.show(headerView);

    // Setup the ChatView

    new ChatInputView({
      el: $('#chat-input'),
      collection: chatCollection
    }).render();

    new ChatCollectionView({
      el: $('#frame-chat'),
      collection: chatCollection,
      userCollection: userCollection
    }).render();

    // Request View
    var requestView = new RequestView({
      collection: requestCollection
    });
    app.requestRegion.show(requestView);

    // File View
    var fileView = new FileView({
      collection: fileCollection
    });
    app.fileRegion.show(fileView);

    // Conversation View
    if (!window.troupeContext.troupe.oneToOne) {
      var conversationView = new ConversationView({
        collection: conversationCollection
      });
      app.mailRegion.show(conversationView);
    }
    else {
      $('#mail-list').hide();
    }

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

    // People View
    var peopleCollectionView = new PeopleCollectionView({
      collection: userCollection
    });
    app.peopleRosterRegion.show(peopleCollectionView);

  });

  app.on("initialize:after", function(){
    router = new Router({});

    router.initialize();
    Backbone.history.start();
  });

  // Asynchronously load tracker
  require([
    'utils/tracking'
  ], function(tracking) {
    // No need to do anything here
  });


  app.start();
  window._troupeDebug = {
    app: app
  };
  return app;
});
