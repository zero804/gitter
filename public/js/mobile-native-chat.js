/*jshint strict:true, undef:true, unused:strict, browser:true *//* global require:false */
require([
  'jquery',
  'collections/chat',
  'views/chat/chatCollectionView',
  'views/chat/chatInputView',
  'components/unread-items-client',
  'components/cache-sync',
  'views/chat/decorators/emojiDecorator',
  'log!mobile-native-chat',
  'components/eyeballs',                        // No ref
  'components/csrf'                             // No ref
  ], function($, chatModels, ChatCollectionView, chatInputView, unreadItemsClient, cacheSync,
    emojiDecorator, log) {

  "use strict";

  $(document).on('app.version.mismatch', function() {
    try {
      if(window.applicationCache.status == 1) {
        log('Attempting to update application cache');
        window.applicationCache.update();
      }
    } catch(e) {
      log('Unable to update application cache: ' + e, e);
    }
  });

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
