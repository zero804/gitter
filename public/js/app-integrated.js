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
  'utils/log',
  'components/errorReporter',
  'filtered-collection'
], function($, _, Backbone, Marionette, _Helpers, TroupeViews, realtime, eyeballs, dozy, AppIntegratedView, ChatInputView, ChatCollectionView, FileView, ConversationView, RequestView,
            troupeModels, fileModels, conversationModels, userModels, chatModels, requestModels, FileDetailView, filePreviewView, fileVersionsView,
            RequestDetailView, PersonDetailView, conversationDetailView, TroupeCollectionView, PeopleCollectionView, profileView, shareView,
            createTroupeView, headerViewTemplate, shareTroupeView,
            troupeSettingsView, webNotifications, unreadItemsClient, log /*, errorReporter , FilteredCollection */) {
  "use strict";

  var preloadedFetch = false;
  if(!window.troupePreloads) {
    preloadedFetch = true;
    $.ajax({
      url: window.location.pathname + '/preload',
      dataType: "json",
      type: "GET",
      success: function(data) {
        window.troupePreloads = data;

        $(document).trigger('preloadComplete', data);
      }
    });

  } else {
    preloadedFetch = false;
  }

  $(document).on('realtime:newConnectionEstablished', function() {
    log('Reloading data');
    $.ajax({
      url: window.location.pathname + '/preload',
      dataType: "json",
      type: "GET",
      success: function(data) {
        requestCollection.fetch();
        fileCollection.reset(data['files'], { parse: true });
        chatCollection.reset(data['chatMessages'], { parse: true });
        conversationCollection.reset(data['conversations'], { parse: true });
        troupeCollection.reset(data['troupes'], { parse: true });
        userCollection.reset(data['users'], { parse: true });
      }
    });
  });


  function instantiateCollection(collection, name) {
    collection.listen();
    if(window.troupePreloads && window.troupePreloads[name]) {
      collection.reset(window.troupePreloads[name], { parse: true });
    } else {

      if(preloadedFetch) {
        $(document).one('preloadComplete', function() {
          collection.reset(window.troupePreloads[name], { parse: true });
        });

      } else {
        collection.fetch();

      }
    }
  }



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
    leftMenuRecent: "#left-menu-list-recent",
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

  $(document).on('troupeUpdate', function(message) {
    $('.trpHeaderTitle').html(message.model.name);
  })


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
        { name: "create",         re: /^create$/,                 viewType: createTroupeView.Modal,       collection: troupeCollection,   skipModelLoad: true },
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

  app.addInitializer(function(/*options*/){
    var preloads = window.troupePreloads || {};
    window.troupePreloads = {};

    var headerView = new (TroupeViews.Base.extend({
      template: headerViewTemplate,
      getRenderData: function() {
        return { user: window.troupeContext.user, troupeContext: troupeContext };
      }
    }))();

    app.headerRegion.show(headerView);

    // Setup the ChatView
    chatCollection = new chatModels.ChatCollection();
    instantiateCollection(chatCollection, 'chatMessages');

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
    instantiateCollection(fileCollection, 'files');

    // File View
    var fileView = new FileView({
      collection: fileCollection
    });
    app.fileRegion.show(fileView);

    // Conversation Collections

    conversationCollection = new conversationModels.ConversationCollection();
    instantiateCollection(conversationCollection, 'conversations');

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


    // Troupe Collections
    troupeCollection = new troupeModels.TroupeCollection();
    instantiateCollection(troupeCollection, 'troupes');

    troupeCollection.on("remove", function(model) {
      if(model.id == window.troupeContext.troupe.id) {
        // TODO: tell the person that they've been kicked out of the troupe
        window.location.reload();
      }
    });
    unreadItemsClient.installTroupeListener(troupeCollection);

    var filteredTroupeCollection = new Backbone.FilteredCollection(null, {model: troupeModels.TroupeModel, collection: troupeCollection });
    filteredTroupeCollection.setFilter(function(m) {
      return !m.get('oneToOne') /* || m.get('unreadItems') > 0 */;
    });

    var peopleOnlyTroupeCollection = new Backbone.FilteredCollection(null, {model: troupeModels.TroupeModel, collection: troupeCollection });
    peopleOnlyTroupeCollection.setFilter(function(m) {
      return m.get('oneToOne');
    });

    var troupeCollectionView = new TroupeCollectionView({
      collection: filteredTroupeCollection
    });
    app.leftMenuTroupes.show(troupeCollectionView);

    var oneToOneTroupeCollectionView = new TroupeCollectionView({
      collection: peopleOnlyTroupeCollection
    });
    app.leftMenuPeople.show(oneToOneTroupeCollectionView);


    // User Collections
    userCollection = new userModels.UserCollection();
    instantiateCollection(userCollection, 'users');

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
      'chats': chatCollection,
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
