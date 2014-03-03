/*jshint strict:true, undef:true, unused:strict, browser:true *//* global require:false */
require([
  'jquery',
  'backbone',
  'utils/context',
  'components/live-context',
  'utils/appevents',
  'views/people/peopleCollectionView',
  'views/app/chatIntegratedView',
  'views/chat/chatInputView',
  'views/chat/chatCollectionView',
  'collections/instances/integrated-items',
  'views/righttoolbar/rightToolbarView',
  'views/shareSearch/inviteView',
  'views/app/troupeSettingsView',
  'views/app/markdownView',
  'views/app/integrationSettingsModal',
  'utils/router',
  'components/unread-items-client',

  'views/chat/decorators/webhookDecorator',
  'views/chat/decorators/issueDecorator',
  'views/chat/decorators/commitDecorator',
  'views/chat/decorators/mentionDecorator',
  'views/chat/decorators/embedDecorator',
  'views/chat/decorators/emojiDecorator',
  'views/app/unreadBannerView',
  'views/app/headerView',

  'views/widgets/preload',      // No ref
  'filtered-collection',        // No ref
  'components/dozy',            // Sleep detection No ref
  'template/helpers/all',       // No ref
  'components/eyeballs',        // No ref
  'bootstrap-dropdown',         // No ref
  'components/bug-reporting',   // No ref
  'components/csrf'             // No ref
], function($, Backbone, context, liveContext, appEvents, peopleCollectionView, ChatIntegratedView, chatInputView,
    ChatCollectionView, itemCollections, RightToolbarView,
    inviteView, troupeSettingsView, markdownView, IntegrationSettingsModal,
    Router, unreadItemsClient, webhookDecorator, issueDecorator, commitDecorator, mentionDecorator,
    embedDecorator, emojiDecorator, UnreadBannerView, HeaderView) {
  "use strict";

  // Make drop down menus drop down
  // This is a bit nasty
  $(document).on("click", ".trpButtonDropdown .trpButtonMenu", function(/*event*/) {
    $(this).parent().next().toggle();
  });

  // When a user clicks an internal link, prevent it from opening in a new window
  $(document).on("click", "a.link", function(e) {
    var basePath = context.env('basePath');
    var href = e.target.getAttribute('href');
    if(!href || href.indexOf(basePath) !== 0) {
      return;
    }

    e.preventDefault();
    window.parent.location.href = href;
  });

  function postMessage(message) {
    parent.postMessage(JSON.stringify(message), context.env('basePath'));
  }


  postMessage({ type: "context.troupeId", troupeId: context.getTroupeId(), name: context.troupe().get('name') });

  appEvents.on('navigation', function(url, type, title) {
    postMessage({ type: "navigation", url: url, urlType: type, title: title});
  });

  appEvents.on('realtime.testConnection', function() {
    postMessage({ type: "realtime.testConnection" });
  });

  appEvents.on('realtime:newConnectionEstablished', function() {
    postMessage({ type: "realtime.testConnection" });
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
    decorators: [webhookDecorator, issueDecorator, commitDecorator, mentionDecorator, embedDecorator, emojiDecorator]
  }).render();

  var unreadChatsModel = unreadItemsClient.acrossTheFold();

  new UnreadBannerView.Top({
    el: '#unread-banner',
    model: unreadChatsModel,
    chatCollectionView: chatCollectionView
  }).render();

  new UnreadBannerView.Bottom({
    el: '#bottom-unread-banner',
    model: unreadChatsModel,
    chatCollectionView: chatCollectionView
  }).render();

  itemCollections.chats.once('sync', function() {
    unreadItemsClient.monitorViewForUnreadItems($('#content-frame'));
  });

  // unreadItemsClient.monitorViewForUnreadItems($('#file-list'));

  new chatInputView.ChatInputView({
    el: $('#chat-input'),
    collection: itemCollections.chats,
    chatCollectionView: chatCollectionView,
    rollers: chatCollectionView.rollers
  }).render();

  // var profileModal = context.getUser().username ? profileView.Modal : completeYourProfileModal;
  function integrationsValidationCheck() {
    return context().permissions.admin;
  }

  new Router({
    routes: [
      { name: "people",           re: /^people/,                  viewType: peopleCollectionView.Modal,         collection: itemCollections.sortedUsers, skipModelLoad: true },
      { name: "inv",              re: /^inv$/,                    viewType: inviteView.Modal },
      { name: "notifications",    re: /^notifications/,           viewType: troupeSettingsView },
      { name: "markdown",         re: /^markdown/,                viewType: markdownView },
      { name: "integrations",     re: /^integrations/,            viewType: IntegrationSettingsModal,  validationCheck: integrationsValidationCheck }
    ],
    regions: [appView.rightPanelRegion, appView.dialogRegion]
  });

  // Listen for changes to the room
  liveContext.syncRoom();

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

  Backbone.history.start();
});
