/*jshint strict:true, undef:true, unused:strict, browser:true *//* global require:false */
require([
  'jquery',
  'mobile-app-container',
  'collections/chat',
  'views/chat/chatCollectionView',
  'views/chat/chatInputView',
  'utils/router',
  'views/shareSearch/shareSearchView'
  ], function($, app, chatModels, ChatCollectionView, chatInputView, Router, shareSearchView) {
  "use strict";

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

  app.addInitializer(function() {
    var dialogRegion = {
      currentView: null,
      show: function(view) {
        if(this.currentView) {
          this.currentView.fade = false;
          this.currentView.hideInternal();
        }
        this.currentView = view;
        view.navigable = true;
        view.show();
      },
      close: function() {
        if(this.currentView) {
          this.currentView.navigationalHide();
          this.currentView = null;
        }
      }
    };

    new Router({
      routes: [
        { name: "share",            re: /^share$/,                  viewType: shareSearchView.Modal },
      ],
      regions: [null, dialogRegion]
    });
  });

  app.content.show(chatCollectionView);
  app.start();
});
