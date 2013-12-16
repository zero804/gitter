/*jshint strict:true, undef:true, unused:strict, browser:true *//* global require:false */
require([
  'jquery',
  'backbone',
  'utils/context',
  'utils/appevents',
  'views/app/chatIntegratedView',
  'views/chat/chatInputView',
  'views/chat/chatCollectionView',
  'collections/instances/integrated-items',
  'collections/instances/troupes',
  // 'collections/useremails',
  'views/righttoolbar/rightToolbarView',
  // 'views/file/filePreviewView',
  // 'views/file/fileVersionsView',
  // 'views/request/requestDetailView',
  // 'views/invite/inviteDetailView',
  'views/people/personDetailView',
  // 'views/conversation//*conversationDetailView'*/,
  // 'views/profile/profileView',
  // 'views/profile/profileEmailView',
  // 'views/profile/profileAddEmailView',
  // 'views/modals/completeYourProfileModal',
  'views/shareSearch/inviteView',
  // 'views/signup//*createTroupeView'*/,
  // 'views/signup/usernameView',
  'views/app/troupeSettingsView',
  'views/app/integrationSettingsModal',
  'views/toolbar/troupeMenu',
  // 'views/invite/reinviteModal',
  'utils/router',
  'components/unread-items-client',

  'views/chat/decorators/fileDecorator',
  'views/chat/decorators/webhookDecorator',
  'views/chat/decorators/userDecorator',
  'views/chat/decorators/embedDecorator',
  'views/chat/decorators/emojiDecorator',
  'views/app/headerView',

  'views/widgets/preload', // No ref
  'components/webNotifications', // No ref
  'components/desktopNotifications', // No ref
  'components/errorReporter',  // No ref
  'filtered-collection', // No ref
  'components/dozy', // Sleep detection No ref
  'template/helpers/all', // No ref
  'components/eyeballs', // No ref
  'bootstrap-dropdown' // No ref
], function($, Backbone, context, appEvents, ChatIntegratedView, chatInputView,
    ChatCollectionView, itemCollections, troupeCollections, /*UserEmailCollection,*/
    RightToolbarView, /*filePreviewView, fileVersionsView,  RequestDetailView,*/
    /*InviteDetailView,*/ PersonDetailView, /*conversationDetailView,*/ /*profileView,
    profileEmailView, profileAddEmailView,*/ /* completeYourProfileModal,*/
    inviteView, /*createTroupeView,*/ /*UsernameView,*/ troupeSettingsView,
    IntegrationSettingsModal, TroupeMenuView, /* ReinviteModal, */ Router,
    unreadItemsClient, FileDecorator, webhookDecorator, userDecorator,
    embedDecorator, emojiDecorator, HeaderView /*, errorReporter , FilteredCollection */) {
  "use strict";

  // Make drop down menus drop down
  $(document).on("click", ".trpButtonDropdown .trpButtonMenu", function(/*event*/) {
    $(this).parent().next().toggle();
  });

  var troupeCollection = troupeCollections.troupes;

  var appView = new ChatIntegratedView({ el: 'body' });
  appView.rightToolbarRegion.show(new RightToolbarView());

  troupeCollection.on("remove", function(model) {
    if(model.id == context.getTroupeId()) {
      // TODO: tell the person that they've been kicked out of the troupe
      window.location = '/' + context.user().get('username');
    }
  });

  new HeaderView({ model: context.troupe(), el: '#header' }).render();

  // instantiate user email collection
  // var userEmailCollection = new UserEmailCollection.UserEmailCollection();

  // Setup the ChatView

  var chatCollectionView = new ChatCollectionView({
    el: $('#content-frame'),
    collection: itemCollections.chats,
    userCollection: itemCollections.users,
    decorators: [new FileDecorator(itemCollections.files), webhookDecorator, userDecorator, embedDecorator, emojiDecorator]
  }).render();

  unreadItemsClient.monitorViewForUnreadItems($('#content-frame'));
  // unreadItemsClient.monitorViewForUnreadItems($('#file-list'));

  new chatInputView.ChatInputView({
    el: $('#chat-input'),
    collection: itemCollections.chats,
    rollers: chatCollectionView.rollers
  }).render();

  // var profileModal = context.getUser().username ? profileView.Modal : completeYourProfileModal;
  function integrationsValidationCheck() {
    return context().permissions.admin;
  }

  new Router({
    routes: [
      // { name: "file",             re: /^file\/(\w+)$/,            viewType: filePreviewView.Modal,               collection: itemCollections.files },
      // { name: "request",          re: /^request\/(\w+)$/,         viewType: RequestDetailView.Modal,            collection: itemCollections.requests },
      // { name: "invite",           re: /^invite\/(\w+)$/,          viewType: InviteDetailView.Modal,             collection: itemCollections.invites },
      // { name: "filePreview",      re: /^file\/preview\/(\w+)$/,   viewType: filePreviewView.Modal,        collection: itemCollections.files },
      // { name: "fileVersions",     re: /^file\/versions\/(\w+)$/,  viewType: fileVersionsView.Modal,       collection: itemCollections.files },
      // { name: "mail",             re: /^mail\/(\w+)$/,            viewType: conversationDetailView.Modal, collection: itemCollections.conversations },
      { name: "person",           re: /^person\/(\w+)$/,          viewType: PersonDetailView.Modal,             collection: itemCollections.users },

      // { name: "profile",          re: /^profile$/,                viewType: profileModal },
      // { name: "profileEmails",    re: /^profile\/emails$/,        viewType: profileEmailView.Modal,       collection: userEmailCollection, skipModelLoad: true },
      // { name: "profileEmailsAdd", re: /^profile\/emails\/add$/,   viewType: profileAddEmailView.Modal,    collection: userEmailCollection, skipModelLoad: true },
      { name: "inv",               re: /^inv$/,                    viewType: inviteView.Modal },
      // { name: "create",           re: /^create$/,                 viewType: createTroupeView.Modal,       collection: troupeCollections.troupes,   skipModelLoad: true },
      // { name: "upgradeOneToOne",  re: /^upgradeOneToOne$/,        viewType: createTroupeView.Modal,       collection: troupeCollections.troupes,   skipModelLoad: true, viewOptions: { upgradeOneToOne: true } } ,
      // { name: "chooseUsername",   re: /^chooseUsername/,          viewType: UsernameView.Modal },
      // { name: "reinvite",         re: /^reinvite\/(\w+)$/,        viewType: ReinviteModal,                collection: troupeCollections.outgoingConnectionInvites, viewOptions: { overrideContext: true, inviteToConnect: true } },
      { name: "troupeSettings",   re: /^troupeSettings/,          viewType: troupeSettingsView },
      { name: "integrations",     re: /^integrations/,            viewType: IntegrationSettingsModal,  validationCheck: integrationsValidationCheck }
    ],
    regions: [appView.rightPanelRegion, appView.dialogRegion]
  });

  function oauthUpgradeCallback(e) {
    if(e.data !== "oauth_upgrade_complete") return;

    window.removeEventListener("message", oauthUpgradeCallback, false);

    $.ajax({
      dataType: "json",
      data: {
        autoConfigureHooks: 1
      },
      type: 'PUT',
      url: '/api/v1/troupes/' + context.getTroupeId(),
      success: function() {
        appEvents.trigger('user_notification', {
          title: 'Thank You',
          text: 'Your integrations have been setup.'
        });
      }
    });
  }

  function promptForHook() {
    appEvents.trigger('user_notification', {
      click: function(e) {
        e.preventDefault();
        window.addEventListener("message", oauthUpgradeCallback, false);
        window.open('/login/upgrade?scopes=public_repo');
      },
      title: 'Authorisation',
      text: 'Your room has been created, but we weren\'t able ' +
            'to integrate with the repository as we need write ' +
            'access to your GitHub repositories. Click here to ' +
            'give Gitter access to do this.',
      timeout: 12000
    });
  }

  if(context.popEvent('hooks_require_additional_public_scope')) {
    setTimeout(promptForHook, 1500);
  }

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
