/*jshint strict:true, undef:true, unused:strict, browser:true *//* global require:false */
require([
  'jquery',
  'routers/mobile/mobile-router',
  'collections/chat',
  'collections/files',
  'views/chat/chatCollectionView',
  'views/chat/chatInputView',
  'components/unread-items-client',
  'components/cache-sync',
  'components/native-troupe-context', // No ref
  'components/oauth',                 // No ref
  'components/native-context'         // No ref
  ], function($, MobileRouter, chatModels, fileModels, ChatCollectionView,
    chatInputView, unreadItemsClient, cacheSync) {
  "use strict";

  var NativeChatRouter = MobileRouter.extend({
    initialize: function() {
      this.constructor.__super__.initialize.apply(this);

      var chatCollection = new chatModels.ChatCollection();
      cacheSync.install(chatCollection);
      chatCollection.listen();

      var filesCollection = new fileModels.FileCollection();
      filesCollection.listen();

      var chatCollectionView = new ChatCollectionView({
        el: $('#content-frame'),
        collection: chatCollection,
        decorators: []
      });

      unreadItemsClient.monitorViewForUnreadItems($('#content-frame'));

      chatCollectionView.render();

      new chatInputView.ChatInputView({
        el: $('#chat-input'),
        collection: chatCollection,
        rollers: chatCollectionView.rollers
      }).render();


      // Keep the unread items up to date on the model
      // This allows the unread items client to mark model items as read
      unreadItemsClient.syncCollections({
        'chat': chatCollection
      });
    }
  });

  new NativeChatRouter();

});
