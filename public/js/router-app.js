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
  'views/people/personDetailView',
  'views/shareSearch/inviteView',
  'views/app/troupeSettingsView',
  'views/app/integrationSettingsModal',
  'views/toolbar/troupeMenu',
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
], function($, Backbone, context, appEvents, AppIntegratedView, chatInputView,
    ChatCollectionView, itemCollections, troupeCollections, RightToolbarView,
    PersonDetailView, inviteView, troupeSettingsView,
    IntegrationSettingsModal, TroupeMenuView, Router,
    unreadItemsClient, FileDecorator, webhookDecorator, userDecorator,
    embedDecorator, emojiDecorator, HeaderView) {
  "use strict";

  // Make drop down menus drop down
  $(document).on("click", ".trpButtonDropdown .trpButtonMenu", function(/*event*/) {
    $(this).parent().next().toggle();
  });

  var troupeCollection = troupeCollections.troupes;

  var appView = new AppIntegratedView({ });

  appView.leftMenuRegion.show(new TroupeMenuView({ }));
  // appView.rightToolbarRegion.show(new RightToolbarView());

  // troupeCollection.on("remove", function(model) {
  //   if(model.id == context.getTroupeId()) {
  //     // TODO: tell the person that they've been kicked out of the troupe
  //     window.location = '/' + context.user().get('username');
  //   }
  // });

  new HeaderView({ model: context.troupe(), el: '#header' }).render();

  // instantiate user email collection
  // var userEmailCollection = new UserEmailCollection.UserEmailCollection();

  // Setup the ChatView

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
