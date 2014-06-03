/*jshint strict:true, undef:true, unused:strict, browser:true *//* global require:false */
require([
  'jquery',
  'collections/chat',
  'views/chat/chatCollectionView',
  'views/chat/chatInputView',
  'components/unread-items-client',
  'components/cache-sync',
  'views/chat/decorators/emojiDecorator',
  'components/eyeballs',                        // No ref
  'components/csrf'                             // No ref
  ], function($, chatModels, ChatCollectionView, chatInputView, unreadItemsClient, cacheSync, emojiDecorator) {

  "use strict";

  var chatCollection = new chatModels.ChatCollection();
  cacheSync.install(chatCollection);
  chatCollection.listen();

  var chatCollectionView = new ChatCollectionView({
    el: $('#frame-chat'),
    collection: chatCollection,
    decorators: [emojiDecorator]
  }).render();

  unreadItemsClient.monitorViewForUnreadItems($('#content-frame'));

  new chatInputView.ChatInputView({
    el: $('#chat-input'),
    collection: chatCollection,
    rollers: chatCollectionView.rollers
  }).render();

  $('html').removeClass('loading');

});
