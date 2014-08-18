require([
  'jquery',
  'utils/appevents',
  'collections/chat',
  'collections/users',
  'views/chat/chatCollectionView',
  'views/chat/chatInputView',
  'components/unread-items-client',
  'backbone',
  'components/modal-region',
  'views/menu/troupeMenu',
  'views/app/mobileAppView',
  'views/chat/decorators/emojiDecorator',
  'views/chat/decorators/mobileDecorator',
  'views/app/troupeSettingsView',
  'components/csrf'                             // No ref
  ], function($, appEvents, chatModels, userModels, ChatCollectionView, chatInputView,
    unreadItemsClient, Backbone, modalRegion, TroupeMenu, MobileAppView,
    emojiDecorator, mobileDecorator, TroupeSettingsView) {
  "use strict";

  new MobileAppView({
    el: $('#mainPage')
  });

  new TroupeMenu({
    el: $('#troupeList')
  }).render();

  appEvents.on('navigation', function(url) {
    window.location.href = url;
  });

  var chatCollection = new chatModels.ChatCollection();
  chatCollection.listen();
  
  var userCollection = new userModels.UserCollection();
  userCollection.listen();

  var chatCollectionView = new ChatCollectionView({
    el: $('#content-frame'),
    collection: chatCollection,
    decorators: [emojiDecorator, mobileDecorator]
  }).render();

  unreadItemsClient.monitorViewForUnreadItems($('#content-frame'));

  new chatInputView.ChatInputView({
    el: $('#chat-input'),
    collection: chatCollection,
    userCollection: userCollection,
    rollers: chatCollectionView.rollers
  }).render();

  var Router = Backbone.Router.extend({
    routes: {
      // TODO: get rid of the pipes
      "!": "hideModal",                  // TODO: remove this soon
      "": "hideModal",
      "notifications": "notifications",
      "|notifications": "notifications", // TODO: remove this soon
    },

    hideModal: function() {
      modalRegion.close();
    },

    notifications: function() {
      modalRegion.show(new TroupeSettingsView({}));
    }
  });

  new Router();

  $('html').removeClass('loading');

  Backbone.history.start();

});
