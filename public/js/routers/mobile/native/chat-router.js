/*jshint strict:true, undef:true, unused:strict, browser:true *//* global require:false */
require([
  'underscore',
  'jquery',
  'routers/mobile/mobile-router',
  'collections/chat',
  'views/chat/chatCollectionView',
  'views/chat/chatInputView',
  'components/unread-items-client',
  'utils/context',
  'log!chat-router',
  'components/native-troupe-context', // No ref
  'components/oauth',                 // No ref
  'components/native-context'         // No ref
  ], function(_, $, MobileRouter, chatModels, ChatCollectionView,
    chatInputView, unreadItemsClient, context, log) {
  "use strict";

  var NativeChatRouter = MobileRouter.extend({
    initialize: function() {
      this.constructor.__super__.initialize.apply(this);
      var troupeId = context.getTroupeId();
      var chatCollection = new chatModels.ChatCollection();
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

      unreadItemsClient.monitorViewForUnreadItems($('#content-frame'));

      chatCollectionView.render();

      new chatInputView.ChatInputView({
        el: $('#chat-input'),
        collection: chatCollection
      }).render();
    }
  });

  new NativeChatRouter();

});
