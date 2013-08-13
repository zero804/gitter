/*jshint strict:true, undef:true, unused:strict, browser:true *//* global require:false */
require([
  'jquery',
  'retina',
  'collections/chat',
  'views/chat/chatCollectionView',
  'views/chat/chatInputView',
  'utils/mobile-resizer',
  'routers/mobile/mobile-router',
  'views/toolbar/troupeMenu',
  'views/app/mobileAppView'
  ], function($, retina, chatModels, ChatCollectionView, chatInputView, mobileResizer, MobileRouter, TroupeMenu, MobileAppView) {
  "use strict";

  var MobileAppRouter = MobileRouter.extend({
    initialize: function() {
      this.constructor.__super__.initialize.apply(this);

      var chatCollection = new chatModels.ChatCollection();
      chatCollection.listen();

      var chatCollectionView = new ChatCollectionView({
        el: $('#frame-chat'),
        collection: chatCollection
      });

      chatCollectionView.render();

      new chatInputView.ChatInputView({
        el: $('#chat-input'),
        collection: chatCollection
      }).render();

      new TroupeMenu({
        el: $('#troupeList')
      }).render();

      new MobileAppView({
        el: $('#pageContainer')
      });

      mobileResizer.reset();

      var fakeWindow = {};
      retina.init(fakeWindow);
      fakeWindow.onload();

      window.addEventListener("orientationchange", function() {
        mobileResizer.reset();
      });
    }
  });

  new MobileAppRouter();

});
