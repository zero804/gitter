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
  'marionette',
  'views/app/mobileAppView'
  ], function($, chatModels, ChatCollectionView, chatInputView, Router, shareSearchView,
    modalRegion, unreadItemsClient, Backbone, TroupeMenu, Marionette, MobileAppView) {
  "use strict";

  new MobileAppView({
    el: $('#mainPage')
  });

  var app = new Marionette.Application();

  app.addRegions({
    content: '#frame-chat'
  });

  app.addInitializer(function() {
      new TroupeMenu({
        el: $('#troupeList')
      }).render();
  });

  app.on('start', function(){
    Backbone.history.start();
  });

  var chatCollection = new chatModels.ChatCollection();
  chatCollection.listen();


  var chatCollectionView = new ChatCollectionView({
    collection: chatCollection
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
