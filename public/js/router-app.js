/*jshint strict:true, undef:true, unused:strict, browser:true *//* global require:false */
require([
  'jquery',
  'backbone',
  'utils/context',
  'views/app/appIntegratedView',
  'views/chat/chatInputView',
  'views/chat/chatCollectionView',
  'collections/instances/integrated-items',
  'collections/instances/troupes',
  'views/righttoolbar/rightToolbarView',
  'views/file/fileDetailView',
  'views/file/filePreviewView',
  'views/file/fileVersionsView',
  'views/request/requestDetailView',
  'views/people/personDetailView',
  'views/conversation/conversationDetailView',
  'views/profile/profileView',
  'views/shareSearch/shareSearchView',
  'views/signup/createTroupeView',
  'views/signup/usernameView',
  'views/app/troupeHeaderView',
  'views/app/troupeSettingsView',
  'views/toolbar/troupeMenu',
  'utils/router',
  'components/webNotifications', // No ref
  'components/errorReporter',  // No ref
  'filtered-collection', // No ref
  'backbone.keys', // no ref,
  'components/dozy', // Sleep detection No ref
  'template/helpers/all' // No ref

], function($, Backbone, context, AppIntegratedView, chatInputView, ChatCollectionView,
            itemCollections, troupeCollections, RightToolbarView, FileDetailView, filePreviewView, fileVersionsView,
            RequestDetailView, PersonDetailView, conversationDetailView, profileView, shareSearchView,
            createTroupeView, UsernameView, TroupeHeaderView,
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
      { name: "request",          re: /^request\/(\w+)$/,         viewType: RequestDetailView,            collection: itemCollections.requests },
      { name: "file",             re: /^file\/(\w+)$/,            viewType: FileDetailView,               collection: itemCollections.files },
      { name: "filePreview",      re: /^file\/preview\/(\w+)$/,   viewType: filePreviewView.Modal,        collection: itemCollections.files },
      { name: "fileVersions",     re: /^file\/versions\/(\w+)$/,  viewType: fileVersionsView.Modal,       collection: itemCollections.files },
      { name: "mail",             re: /^mail\/(\w+)$/,            viewType: conversationDetailView.Modal, collection: itemCollections.conversations },
      { name: "person",           re: /^person\/(\w+)$/,          viewType: PersonDetailView,             collection: itemCollections.users },

      { name: "profile",          re: /^profile$/,                viewType: profileView.Modal },
      { name: "share",            re: /^share$/,                  viewType: shareSearchView.Modal },
      { name: "connect",          re: /^connect$/,                viewType: shareSearchView.Modal,        viewOptions: { overrideContext: true, inviteToConnect: true } },
      { name: "create",           re: /^create$/,                 viewType: createTroupeView.Modal,       collection: troupeCollections.troupes,   skipModelLoad: true },
      { name: "upgradeOneToOne",  re: /^upgradeOneToOne$/,        viewType: createTroupeView.Modal,       collection: troupeCollections.troupes,   skipModelLoad: true, viewOptions: { upgradeOneToOne: true } } ,
      { name: "chooseUsername",   re: /^chooseUsername/,          viewType: UsernameView.Modal },
      { name: "troupeSettings",   re: /^troupeSettings/,          viewType: troupeSettingsView }
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
