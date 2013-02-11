/*jshint unused:true browser:true*/
require([
  'jquery',
  'underscore',
  'backbone',
  'marionette',
  'template/helpers/all',
  'views/base',
  'components/realtime',
  'views/app/appIntegratedView',
  'views/chat/chatInputView',
  'views/chat/chatCollectionView',
  'views/file/fileView',
  'views/conversation/conversationView',
  'views/request/requestView',
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
  'components/logging'
], function($, _, Backbone, Marionette, _Helpers, TroupeViews, realtime, AppIntegratedView, ChatInputView, ChatCollectionView, FileView, ConversationView, RequestView,
            troupeModels, fileModels, conversationModels, userModels, chatModels, requestModels, FileDetailView, filePreviewView, fileVersionsView,
            RequestDetailView, PersonDetailView, conversationDetailView, TroupeCollectionView, PeopleCollectionView, profileView, shareView,
            createTroupeView, headerViewTemplate, shareTroupeView,
            troupeSettingsView, webNotifications, unreadItemsClient, logging) {
  /*global console:true require:true */
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
  app.addRegions({
    leftMenuRegion: "#left-menu-list",
    peopleRosterRegion: "#people-roster",
    fileRegion: "#file-list",
    mailRegion: "#mail-list",
    requestRegion: "#request-roster",
    rightPanelRegion: "#right-panel",
    headerRegion: "#header-region"
  });

  /*var subscription = */ realtime.subscribe('/troupes/' + window.troupeContext.troupe.id, function(message) {
    console.log("Subscription!", message);
    if(message.notification === 'presence') {
      if(message.status === 'in') {
        $(document).trigger('userLoggedIntoTroupe', message);
      } else if(message.status === 'out') {
        $(document).trigger('userLoggedOutOfTroupe', message);
      }
    }
    if (message.operation === "update")
      $('.trpHeaderTitle').html(message.model.name);
  });



  /* This is a special region which acts like a region, but is implemented completely differently */
  app.dialogRegion = {
    currentView: null,
    show: function(view) {
      if(this.currentView) {
        console.log("Closing view: " + this.currentView);
        this.currentView.fade = false;
        this.currentView.hideInternal();
      }
      this.currentView = view;
      view.navigable = true;
      view.show();
    },
    close: function() {
      if(this.currentView) {
        console.log("Closing view: " + this.currentView);
        this.currentView.navigationalHide();
        this.currentView = null;
      }
    }
  };

  var router;
  var requestCollection, fileCollection, chatCollection, conversationCollection, troupeCollection, userCollection;
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
        { name: "request",        re: /^request\/(\w+)$/,         viewType: RequestDetailView,            collection: requestCollection },
        { name: "file",           re: /^file\/(\w+)$/,            viewType: FileDetailView,               collection: fileCollection },
        { name: "filePreview",    re: /^file\/preview\/(\w+)$/,   viewType: filePreviewView.Modal,        collection: fileCollection },
        { name: "fileVersions",   re: /^file\/versions\/(\w+)$/,  viewType: fileVersionsView.Modal,       collection: fileCollection },
        { name: "mail",           re: /^mail\/(\w+)$/,            viewType: conversationDetailView.Modal, collection: conversationCollection },
        { name: "person",         re: /^person\/(\w+)$/,          viewType: PersonDetailView,             collection: userCollection },

        { name: "profile",        re: /^profile$/,                viewType: profileView.Modal },
        { name: "share",          re: /^share$/,                  viewType: shareView.Modal },
        { name: "create",         re: /^create$/,                 viewType: createTroupeView.Modal },
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
          var model = viewDetails.collection ? viewDetails.collection.get(viewDetails.id) : null;
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
          console.log("APPNAV");
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

              if(viewDetails.collection) {
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

  app.addInitializer(function(/*options*/){
    var headerView = new (TroupeViews.Base.extend({
      template: headerViewTemplate,
      getRenderData: function() {
        return { user: window.troupeContext.user };
      }
    }))();
    app.headerRegion.show(headerView);

    // Setup the ChatView
    chatCollection = new chatModels.ChatCollection();
    chatCollection.setSortBy('-sent');
    chatCollection.listen();
    chatCollection.reset(window.troupePreloads['chatMessages'], { parse: true });

    new ChatInputView({
      el: $('#chat-input'),
      collection: chatCollection
    }).render();

    new ChatCollectionView({
      el: $('#frame-chat'),
      collection: chatCollection
    }).render();

    // Request Collections
    requestCollection = new requestModels.RequestCollection();
    requestCollection.listen();
    requestCollection.fetch();

    // Request View
    var requestView = new RequestView({
      collection: requestCollection
    });
    app.requestRegion.show(requestView);

    // File Collections

    fileCollection = new fileModels.FileCollection();
    fileCollection.listen();
    fileCollection.reset(window.troupePreloads['files'], { parse: true });

    // File View
    var fileView = new FileView({
      collection: fileCollection
    });
    app.fileRegion.show(fileView);

    // Conversation Collections

    conversationCollection = new conversationModels.ConversationCollection();
    conversationCollection.listen();
    conversationCollection.reset(window.troupePreloads['conversations'], { parse: true });

    // Conversation View
    var conversationView = new ConversationView({
      collection: conversationCollection
    });

    app.mailRegion.show(conversationView);

    // Troupe Collections
    troupeCollection = new troupeModels.TroupeCollection();
    unreadItemsClient.installTroupeListener(troupeCollection);

    troupeCollection.fetch();
    var troupeCollectionView = new TroupeCollectionView({
      collection: troupeCollection
    });
    app.leftMenuRegion.show(troupeCollectionView);

    // User Collections
    userCollection = new userModels.UserCollection();
    userCollection.reset(window.troupePreloads['users'], { parse: true });
    userCollection.listen();

    window.troupePreloads = {};

    // update online status of user models
    $(document).on('userLoggedIntoTroupe', updateUserStatus);
    $(document).on('userLoggedOutOfTroupe', updateUserStatus);

    function updateUserStatus(e, data) {
      var user = userCollection.get(data.userId);
      if (user) {
        // the backbone models have not always come through before the presence events,
        // but they will come with an accurate online status so we can just ignore the presence event
        user.set('online', (data.status === 'in') ? true : false);
      }
    }

    // send out a change event to avatar widgets that are not necessarily connected to a model object.
    userCollection.on('change', function(model) {
      $(document).trigger("avatar:change", model.toJSON());
    });

    // People View
    var peopleCollectionView = new PeopleCollectionView({
      collection: userCollection
    });
    app.peopleRosterRegion.show(peopleCollectionView);


    app.collections = {
      'requests': requestCollection,
      'files': fileCollection,
      'conversations': conversationCollection,
      'troupes': troupeCollection,
      'users': userCollection
    };

  });

  app.on("initialize:after", function(){
    router = new Router({});

    router.initialize();
    Backbone.history.start();

    console.log("History started");
  });

  // Asynchronously load tracker
  require([
    'utils/tracking'
  ], function(tracking) {
    // No need to do anything here
  });

  app.start();

  return app;
});
