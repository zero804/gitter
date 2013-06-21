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
  'views/app/invitesView',
  'views/app/troupeHeaderView',
  'views/app/troupeSettingsView',
  'views/toolbar/troupeMenu',
  'utils/router',
  'components/errorReporter',
  'filtered-collection'
], function($, _, Backbone, _backboneKeys, Marionette, _Helpers, TroupeViews, realtime, eyeballs, dozy, AppIntegratedView, chatInputView, ChatCollectionView, FileView, ConversationView, RequestView,
            itemCollections, troupeCollections, FileDetailView, filePreviewView, fileVersionsView,
            RequestDetailView, PersonDetailView, conversationDetailView, TroupeCollectionView, PeopleCollectionView, profileView, shareSearchView,
            createTroupeView, InvitesView, TroupeHeaderView,
            troupeSettingsView, TroupeMenuView, Router /*, errorReporter , FilteredCollection */) {
  "use strict";

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
    peopleRosterRegion: "#people-roster",
    fileRegion: "#file-list",
    mailRegion: ".frame-conversations",
    requestRegion: "#request-roster",
    rightPanelRegion: "#right-panel",
    headerRegion: "#header-wrapper"
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
  new TroupeMenuView({ app: app });

  // reference collections
  var chatCollection = itemCollections.chats;
  var requestCollection = itemCollections.requests;
  var fileCollection = itemCollections.files;
  var conversationCollection = itemCollections.conversations;
  var userCollection = itemCollections.users;

  app.addInitializer(function(/*options*/){

    var headerView = new TroupeHeaderView();

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
    app.requestRegion.show(new RequestView({ collection: requestCollection }));

    // File View
    app.fileRegion.show(new FileView({ collection: fileCollection }));

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

    // People View
    app.peopleRosterRegion.show(new PeopleCollectionView({ collection: userCollection }));

  });

  app.on("initialize:after", function(){
    router = new Router({
      routes: [
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
