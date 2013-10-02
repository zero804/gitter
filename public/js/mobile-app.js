/*jshint strict:true, undef:true, unused:strict, browser:true *//* global require:false */
require([
  'jquery',
  'mobile-app-container',
  'collections/chat',
  'views/chat/chatCollectionView',
  'views/chat/chatInputView',
  'utils/router',
  'views/shareSearch/shareSearchView',
  'components/modal-region',
  'components/unread-items-client',
  'views/chat/decorators/fileDecorator',
  ], function($, app, chatModels, ChatCollectionView, chatInputView, Router, shareSearchView, modalRegion, unreadItemsClient, fileDecorator) {
  "use strict";

  var chatCollection = new chatModels.ChatCollection();
  chatCollection.listen();

  var chatCollectionView = new ChatCollectionView({
    collection: chatCollection,
    decorators: [fileDecorator]
  });

  unreadItemsClient.monitorViewForUnreadItems($('#content-frame'));

  new chatInputView.ChatInputView({
    el: $('#chat-input'),
    collection: chatCollection,
    rollers: chatCollectionView.rollers
  }).render();

  app.addInitializer(function() {

    new Router({
      routes: [
        { name: "share",            re: /^share$/,                  viewType: shareSearchView.Modal },
      ],
      regions: [null, modalRegion]
    });
  });

  app.content.show(chatCollectionView);
  app.start();
});
