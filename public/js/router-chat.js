/*jshint strict:true, undef:true, unused:strict, browser:true *//* global require:false */
require([
  'jquery',
  'backbone',
  'utils/context',
  'utils/appevents',
  'views/people/peopleCollectionView',
  'views/app/chatIntegratedView',
  'views/chat/chatInputView',
  'views/chat/chatCollectionView',
  'collections/instances/integrated-items',
  'views/righttoolbar/rightToolbarView',
  'views/people/personDetailView',
  'views/shareSearch/inviteView',
  'views/app/troupeSettingsView',
  'views/app/markdownView',
  'views/app/integrationSettingsModal',
  'utils/router',
  'components/unread-items-client',

  'views/chat/decorators/fileDecorator',
  'views/chat/decorators/webhookDecorator',
  'views/chat/decorators/issueDecorator',
  'views/chat/decorators/mentionDecorator',
  'views/chat/decorators/embedDecorator',
  'views/chat/decorators/emojiDecorator',
  'views/app/unreadBannerView',
  'views/app/headerView',

  'views/widgets/preload', // No ref
  'components/errorReporter',  // No ref
  'filtered-collection', // No ref
  'components/dozy', // Sleep detection No ref
  'template/helpers/all', // No ref
  'components/eyeballs', // No ref
  'bootstrap-dropdown' // No ref
], function($, Backbone, context, appEvents, peopleCollectionView, ChatIntegratedView, chatInputView,
    ChatCollectionView, itemCollections, RightToolbarView,
    PersonDetailView, inviteView, troupeSettingsView, markdownView, IntegrationSettingsModal,
    Router, unreadItemsClient, FileDecorator, webhookDecorator, issueDecorator, mentionDecorator,
    embedDecorator, emojiDecorator, UnreadBannerView, HeaderView) {
  "use strict";

  // Make drop down menus drop down
  $(document).on("click", ".trpButtonDropdown .trpButtonMenu", function(/*event*/) {
    $(this).parent().next().toggle();
  });

  parent.postMessage(JSON.stringify({ type: "context.troupeId", troupeId: context.getTroupeId(), name: context.troupe().get('name') }), context.env('basePath'));

  appEvents.on('navigation', function(url, type, title) {
    parent.postMessage(JSON.stringify({ type: "navigation", url: url, urlType: type, title: title}), context.env('basePath'));
  });

  var appView = new ChatIntegratedView({ el: 'body' });
  appView.rightToolbarRegion.show(new RightToolbarView());

  new HeaderView({ model: context.troupe(), el: '#header' }).render();

  // instantiate user email collection
  // var userEmailCollection = new UserEmailCollection.UserEmailCollection();

  // Setup the ChatView

  var chatCollectionView = new ChatCollectionView({
    el: $('#content-frame'),
    collection: itemCollections.chats,
    userCollection: itemCollections.users,
    decorators: [new FileDecorator(itemCollections.files), webhookDecorator, issueDecorator, mentionDecorator, embedDecorator, emojiDecorator]
  }).render();

  new UnreadBannerView({
    el: '#unread-banner',
    collection: itemCollections.chats,
    chatCollectionView: chatCollectionView
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
      { name: "person",           re: /^person\/(\w+)$/,          viewType: PersonDetailView.Modal,             collection: itemCollections.users },
      { name: "people",           re: /^people/,                  viewType: peopleCollectionView.Modal,         collection: itemCollections.sortedUsers, skipModelLoad: true },
      { name: "inv",              re: /^inv$/,                    viewType: inviteView.Modal },
      { name: "troupeSettings",   re: /^troupeSettings/,          viewType: troupeSettingsView },
      { name: "markdown",         re: /^markdown/,                viewType: markdownView },
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

  if(context.popEvent('room_created_now')) {
    if (!context.getTroupe().oneToOne) {
      setTimeout(function() {
        window.location.hash = "!|inv";
      }, 500);
    }
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
});
