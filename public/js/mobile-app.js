/*jshint strict:true, undef:true, unused:strict, browser:true *//* global require:false */
require([
  'jquery',
  'collections/chat',
  'views/chat/chatCollectionView',
  'views/chat/chatInputView',
  'utils/router',
  'views/shareSearch/shareSearchView',
  'components/modal-region',
  'components/unread-items-client',
  'backbone',
  'views/toolbar/troupeMenu',
  'views/app/mobileAppView'
  ], function($, chatModels, ChatCollectionView, chatInputView, Router, shareSearchView,
    modalRegion, unreadItemsClient, Backbone, TroupeMenu, MobileAppView) {
  "use strict";

  new MobileAppView({
    el: $('#mainPage')
  });

  new TroupeMenu({
    el: $('#troupeList')
  }).render();

  var chatCollection = new chatModels.ChatCollection();
  chatCollection.listen();

  var chatCollectionView = new ChatCollectionView({
    el: $('#frame-chat'),
    collection: chatCollection
  }).render();

  unreadItemsClient.monitorViewForUnreadItems($('#content-frame'));

  new chatInputView.ChatInputView({
    el: $('#chat-input'),
    collection: chatCollection,
    rollers: chatCollectionView.rollers
  }).render();

  new Router({
    routes: [
      { name: "share",            re: /^share$/,                  viewType: shareSearchView.Modal },
    ],
    regions: [null, modalRegion]
  });

  Backbone.history.start();

});
