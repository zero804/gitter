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
  'components/eyeballs',
  'components/dozy',
  'views/app/appIntegratedView',
  'views/chat/chatInputView',
  'views/chat/chatCollectionView',
  'views/file/fileView',
  'views/conversation/conversationView',
  'views/request/requestView',
  'collections/instances/integrated-items',
  'collections/instances/troupes',
  'views/file/fileDetailView',
  'views/file/filePreviewView',
  'views/file/fileVersionsView',
  'views/request/requestDetailView',
  'views/people/personDetailView',
  'views/conversation/conversationDetailView',
  'views/toolbar/troupeCollectionView',
  'views/people/peopleCollectionView',
  'views/profile/profileView',
  'views/shareSearch/shareSearchView',
  'views/signup/createTroupeView',
  'hbs!./views/invite/tmpl/invitesItemTemplate',
  'hbs!./views/app/tmpl/appHeader',
  'views/app/troupeSettingsView',
  'components/errorReporter',
  'filtered-collection'
], function($, _, Backbone, _backboneKeys, Marionette, _Helpers, TroupeViews, realtime, eyeballs, dozy, AppIntegratedView, chatInputView, ChatCollectionView, FileView, ConversationView, RequestView,
            itemCollections, troupeCollections, FileDetailView, filePreviewView, fileVersionsView,
            RequestDetailView, PersonDetailView, conversationDetailView, TroupeCollectionView, PeopleCollectionView, profileView, shareSearchView,
            createTroupeView, invitesItemTemplate, headerViewTemplate,
            troupeSettingsView /*, errorReporter , FilteredCollection */) {
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

  var troupeCollection = troupeCollections.troupes;

  troupeCollection.on("remove", function(model) {
    if(model.id == window.troupeContext.troupe.id) {
      // TODO: tell the person that they've been kicked out of the troupe
      if(window.troupeContext.troupeIsDeleted) {
        window.location.href = '/last';
      } else {
        window.location.reload();
      }
    }
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
        { name: "request",        re: /^request\/(\w+)$/,         viewType: RequestDetailView,            collection: itemCollections.requests },
        { name: "file",           re: /^file\/(\w+)$/,            viewType: FileDetailView,               collection: itemCollections.files },
        { name: "filePreview",    re: /^file\/preview\/(\w+)$/,   viewType: filePreviewView.Modal,        collection: itemCollections.files },
        { name: "fileVersions",   re: /^file\/versions\/(\w+)$/,  viewType: fileVersionsView.Modal,       collection: itemCollections.files },
        { name: "mail",           re: /^mail\/(\w+)$/,            viewType: conversationDetailView.Modal, collection: itemCollections.conversations },
        { name: "person",         re: /^person\/(\w+)$/,          viewType: PersonDetailView,             collection: itemCollections.users },

        { name: "profile",        re: /^profile$/,                viewType: profileView.Modal },
        { name: "share",          re: /^share$/,                  viewType: shareSearchView.Modal },
        { name: "create",         re: /^create$/,                 viewType: createTroupeView.Modal,       collection: troupeCollections.troupes,   skipModelLoad: true },
        { name: "upgradeOneToOne",  re: /^upgradeOneToOne$/,      viewType: createTroupeView.Modal,       collection: troupeCollections.troupes,   skipModelLoad: true, viewOptions: { upgradeOneToOne: true } } ,
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

  // reference collections
  var chatCollection = itemCollections.chats;
  var requestCollection = itemCollections.requests;
  var fileCollection = itemCollections.files;
  var conversationCollection = itemCollections.conversations;
  var userCollection = itemCollections.users;

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

    // Setup the ChatView

    var chatCollectionView = new ChatCollectionView({
      el: $('#frame-chat'),
      collection: chatCollection,
      userCollection: userCollection
    }).render();

    new chatInputView.ChatInputView({
      el: $('#chat-input'),
      collection: chatCollection,
      scrollDelegate: chatCollectionView.scrollDelegate
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

    // incoming invites collection view
    var invitesCollectionView = new Marionette.CollectionView({
      collection: incomingInvitesCollection,
      itemView: TroupeViews.Base.extend({
        tagName: 'li',
        template: invitesItemTemplate
      })
    });
    app.leftMenuInvites.show(invitesCollectionView);

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
  ], function(/*tracking*/) {
    // No need to do anything here
  });


  app.start();
  window._troupeDebug = {
    app: app
  };
  return app;
});
