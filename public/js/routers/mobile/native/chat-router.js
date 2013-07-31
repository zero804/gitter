/*jshint strict:true, undef:true, unused:strict, browser:true *//* global require:false */
require([
  'jquery',
  'routers/mobile/mobile-router',
  'collections/chat',
  'views/chat/chatCollectionView',
  'views/chat/chatInputView',
  'utils/mobile-resizer'
  ], function($, MobileRouter, chatModels, ChatCollectionView, chatInputView, mobileResizer) {
  "use strict";

  var NativeChatRouter = MobileRouter.extend({
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
        collection: chatCollection,
        scrollDelegate: chatCollectionView.scrollDelegate
      }).render();

      mobileResizer.reset();

      // Prevent Header & Footer From Showing Browser Chrome
      document.addEventListener('touchmove', function(event) {
         if(event.target.parentNode.className.indexOf('noBounce') != -1 || event.target.className.indexOf('noBounce') != -1 ) {
        event.preventDefault(); }
      }, false);
    }
  });

  new NativeChatRouter();

});
