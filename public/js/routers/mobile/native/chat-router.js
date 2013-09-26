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
  'components/unread-items-client',
  'log!chat-router',
  'components/oauth',         // No ref
  'components/native-context' // No ref
  ], function(_, $, MobileRouter, chatModels, context, ChatCollectionView, chatInputView, mobileResizer, unreadItemsClient, log) {
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
      function snapshotSuccess(result) {
        chatCollection.reset(result, { parse: true });
        log('Loaded ' + result.length + ' items from cache');
        $('#chat-amuse').hide('fast', function() {
          $(this).remove();
        });

      }

      this.constructor.__super__.initialize.apply(this);

      var chatCollection = new chatModels.ChatCollection([], { troupeId: troupeId, parse: true });


      var cordova = window.cordova;

      if(cordova) {

        document.addEventListener("deviceready", function() {
          cordova.exec(snapshotSuccess, function() {}, "ChatSnapshot",
                   "getChatsForTroupe", [troupeId]);
        });
      }
      /*
      var cache = window.localStorage['cache_chat_' + troupeId];
      if(cache) {
        cache = JSON.parse(cache);
      }
      */

      chatCollection.listen();
      chatCollection.on('change reset sync add remove', _.debounce(function() {
        window.localStorage['cache_chat_' + troupeId] = JSON.stringify(chatCollection.toJSON());
      }, 500));

      var chatCollectionView = new ChatCollectionView({
        el: $('#content-frame'),
        collection: chatCollection
      });

      unreadItemsClient.monitorViewForUnreadItems($('#content-frame'));

      chatCollectionView.render();

      new chatInputView.ChatInputView({
        el: $('#chat-input'),
        collection: chatCollection,
        scrollDelegate: chatCollectionView.rollers
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
