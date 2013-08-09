/*jshint strict:true, undef:true, unused:strict, browser:true *//* global require:false */
require([
  'underscore',
  'jquery',
  'routers/mobile/mobile-router',
  'collections/chat',
  'utils/context',
  'views/chat/chatCollectionView',
  'views/chat/chatInputView',
  'utils/mobile-resizer',
  'log!chat-router',
  'components/native-context' // No ref
  ], function(_, $, MobileRouter, chatModels, context, ChatCollectionView, chatInputView, mobileResizer, log) {
  "use strict";

  // TODO: normalise this
  var troupeId = window.location.hash.substring(1);
  if(troupeId) {
    window.location.hash = '';
  } else {
    troupeId = window.localStorage.lastTroupeId;
  }

  if(troupeId) {
    context.setTroupeId(troupeId);
    window.localStorage.lastTroupeId = troupeId;
  }


  var NativeChatRouter = MobileRouter.extend({
    initialize: function() {
      this.constructor.__super__.initialize.apply(this);

      var chatCollection = new chatModels.ChatCollection([], { troupeId: troupeId, parse: true });
      var cache = window.localStorage['cache_chat_' + troupeId];
      if(cache) {
        cache = JSON.parse(cache);
        chatCollection.reset(cache, { parse: true });
        log('Loaded ' + cache.length + ' items from cache');
        $('#chat-amuse').hide('fast', function() {
          $(this).remove();
        });
      }

      chatCollection.listen();
      chatCollection.on('change reset sync add remove', _.debounce(function() {
        window.localStorage['cache_chat_' + troupeId] = JSON.stringify(chatCollection.toJSON());
      }, 500));

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
