/*jshint strict:true, undef:true, unused:strict, browser:true *//* global require:false */
require([
  'jquery',
  'backbone',
  'utils/context',
  'utils/appevents',
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
  'views/invite/inviteDetailView',
  'views/people/personDetailView',
  'views/conversation/conversationDetailView',
  'views/profile/profileView',
  'views/profile/profileEmailView',
  'views/profile/profileAddEmailView',
  'views/shareSearch/shareSearchView',
  'views/signup/createTroupeView',
  'views/signup/usernameView',
  'views/app/troupeSettingsView',
  'views/toolbar/troupeMenu',
  'views/invite/reinviteModal',
  'utils/router',
  'components/unread-items-client',
  'views/chat/decorator',
  'views/app/smartCollectionView',
  'views/widgets/preload', // No ref
  'components/webNotifications', // No ref
  'components/desktopNotifications', // No ref
  'components/errorReporter',  // No ref
  'filtered-collection', // No ref
  'components/dozy', // Sleep detection No ref
  'template/helpers/all', // No ref
  'components/eyeballs' // No ref
], function($, Backbone, context, appEvents, AppIntegratedView, chatInputView, ChatCollectionView,
            itemCollections, troupeCollections, RightToolbarView, FileDetailView, filePreviewView,
            fileVersionsView, RequestDetailView, InviteDetailView, PersonDetailView, conversationDetailView,
            profileView, profileEmailView, profileAddEmailView, shareSearchView, createTroupeView,
            UsernameView, troupeSettingsView, TroupeMenuView, ReinviteModal, Router,
            unreadItemsClient, chatDecorator, SmartCollectionView /*, errorReporter , FilteredCollection */) {
  "use strict";

  // Make drop down menus drop down
  $(document).on("click", ".trpButtonDropdown .trpButtonMenu", function(/*event*/) {
    $(this).parent().next().toggle();
  });

  var troupeCollection = troupeCollections.troupes;

  troupeCollection.on("remove", function(model) {
    if(model.id == context.getTroupeId()) {
      // TODO: tell the person that they've been kicked out of the troupe
      window.location.reload();
    }
  });


  var appView = new AppIntegratedView({ });
  appView.smartMenuRegion.show(new SmartCollectionView({ collection: troupeCollections.megaCollection }));
  appView.leftMenuRegion.show(new TroupeMenuView({ }));
  appView.rightToolbarRegion.show(new RightToolbarView());

  $('.nano').nanoScroller({ preventPageScrolling: true });

  // Setup the ChatView

  var chatCollectionView = new ChatCollectionView({
    el: $('#content-frame'),
    collection: itemCollections.chats,
    userCollection: itemCollections.users,
    decorator: chatDecorator
  }).render();

  unreadItemsClient.monitorViewForUnreadItems($('#content-frame'));
  unreadItemsClient.monitorViewForUnreadItems($('#toolbar-frame .nano'));


  new chatInputView.ChatInputView({
    el: $('#chat-input'),
    collection: itemCollections.chats
  }).render();

  new Router({
    routes: [
      { name: "request",          re: /^request\/(\w+)$/,         viewType: RequestDetailView,            collection: itemCollections.requests },
      { name: "invite",           re: /^invite\/(\w+)$/,          viewType: InviteDetailView,             collection: itemCollections.invites },
      { name: "file",             re: /^file\/(\w+)$/,            viewType: FileDetailView,               collection: itemCollections.files },
      { name: "filePreview",      re: /^file\/preview\/(\w+)$/,   viewType: filePreviewView.Modal,        collection: itemCollections.files },
      { name: "fileVersions",     re: /^file\/versions\/(\w+)$/,  viewType: fileVersionsView.Modal,       collection: itemCollections.files },
      { name: "mail",             re: /^mail\/(\w+)$/,            viewType: conversationDetailView.Modal, collection: itemCollections.conversations },
      { name: "person",           re: /^person\/(\w+)$/,          viewType: PersonDetailView,             collection: itemCollections.users },

      { name: "profile",          re: /^profile$/,                viewType: profileView.Modal },
      { name: "profileEmails",    re: /^profile\/emails$/,        viewType: profileEmailView.Modal },
      { name: "profileEmailsAdd", re: /^profile\/emails\/add$/,   viewType: profileAddEmailView.Modal },
      { name: "share",            re: /^share$/,                  viewType: shareSearchView.Modal },
      { name: "connect",          re: /^connect$/,                viewType: shareSearchView.Modal,        viewOptions: { overrideContext: true, inviteToConnect: true } },
      { name: "create",           re: /^create$/,                 viewType: createTroupeView.Modal,       collection: troupeCollections.troupes,   skipModelLoad: true },
      { name: "upgradeOneToOne",  re: /^upgradeOneToOne$/,        viewType: createTroupeView.Modal,       collection: troupeCollections.troupes,   skipModelLoad: true, viewOptions: { upgradeOneToOne: true } } ,
      { name: "chooseUsername",   re: /^chooseUsername/,          viewType: UsernameView.Modal },
      { name: "reinvite",         re: /^reinvite\/(\w+)$/,        viewType: ReinviteModal,                collection: troupeCollections.outgoingConnectionInvites, viewOptions: { overrideContext: true, inviteToConnect: true } },
      { name: "troupeSettings",   re: /^troupeSettings/,          viewType: troupeSettingsView }
    ],
    regions: [appView.rightPanelRegion, appView.dialogRegion]
  });


  if(!window.localStorage.troupeTourApp) {
    window.localStorage.troupeTourApp = 1;
    require([
      'tours/tour-controller'
    ], function(tourController) {
      tourController.init({ appIntegratedView: appView });
    });
  }

  Backbone.history.start();

  // Asynchronously load tracker
  require([
    'utils/tracking'
  ], function(/*tracking*/) {
    // No need to do anything here
  });
});
