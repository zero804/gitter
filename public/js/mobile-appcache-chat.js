/*jshint strict:true, undef:true, unused:strict, browser:true *//* global require:false */
require(['utils/context'], function(context) {
  "use strict";

  // The room id is taken from the hash instead of the url.
  // This means that the we can use the same url for all rooms, and so
  // cache one page in the user's browser!
  var roomId = window.location.hash.split('#')[1];
  context.setTroupeId(roomId);

  require([
    'jquery',
    'collections/chat',
    'views/chat/chatCollectionView',
    'views/chat/chatInputView',
    'components/unread-items-client',
    'views/chat/decorators/emojiDecorator',
    'components/csrf'                             // No ref
    ], function($, chatModels, ChatCollectionView, chatInputView,
      unreadItemsClient, emojiDecorator) {

    var chatCollection = new chatModels.ChatCollection();
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

});
