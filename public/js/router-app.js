/*jshint unused:strict, browser:true */
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
  'views/righttoolbar/rightToolbarView',
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
            itemCollections, troupeCollections, RightToolbarView, FileDetailView, filePreviewView, fileVersionsView,
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
    if(model.id == context.getTroupeId()) {
      // TODO: tell the person that they've been kicked out of the troupe
      if(window.troupeContext.troupeIsDeleted) {
        window.location.href = '/last';
      } else {
        window.location.reload();
      }
    }
  });


  var appView = new AppIntegratedView({ });
  appView.leftMenuRegion.show(new TroupeMenuView({ }));
  appView.headerRegion.show(new TroupeHeaderView  ());
  appView.rightToolbarRegion.show(new RightToolbarView());

  $('.nano').nanoScroller({ preventPageScrolling: true });

  // Setup the ChatView

  var chatCollectionView = new ChatCollectionView({
    el: $('#frame-chat'),
    collection: itemCollections.chats,
    userCollection: itemCollections.users
  }).render();

  new chatInputView.ChatInputView({
    el: $('#chat-input'),
    collection: itemCollections.chats,
    scrollDelegate: chatCollectionView.scrollDelegate
  }).render();

  new Router({
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
    appView: appView
  });

  Backbone.history.start();

  // Asynchronously load tracker
  require([
    'utils/tracking'
  ], function(/*tracking*/) {
    // No need to do anything here
  });
});
