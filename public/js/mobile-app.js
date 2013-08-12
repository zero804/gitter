/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
require([
  'mobile-app-container',
  'collections/chat',
  'views/chat/chatCollectionView',
  'views/chat/chatInputView'
  ], function(app, chatModels, ChatCollectionView, chatInputView) {

  var chatCollection = new chatModels.ChatCollection();
  chatCollection.listen();

  var chatCollectionView = new ChatCollectionView({
    collection: chatCollection
  });

  new chatInputView.ChatInputView({
    el: $('#chat-input'),
    collection: chatCollection,
    scrollDelegate: chatCollectionView.scrollDelegate
  }).render();

  app.content.show(chatCollectionView);
  app.start();
});
