/*jshint strict:true, undef:true, unused:strict, browser:true *//* global require:false */
require([
  'jquery',
  'routers/mobile/mobile-router',
  'collections/chat',
  'utils/context',
  'views/chat/chatCollectionView',
  'views/chat/chatInputView',
  'components/unread-items-client',
  'components/cache-sync',
  'components/oauth',             // No ref
  'components/native-context'     // No ref
  ], function($, MobileRouter, chatModels, context, ChatCollectionView,
    chatInputView, unreadItemsClient, cacheSync) {
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
      cacheSync.install(chatCollection);
      chatCollection.listen();

      var chatCollectionView = new ChatCollectionView({
        el: $('#content-frame'),
        collection: chatCollection
      });

      unreadItemsClient.monitorViewForUnreadItems($('#content-frame'));

      chatCollectionView.render();

      new chatInputView.ChatInputView({
        el: $('#chat-input'),
        collection: chatCollection,
        rollers: chatCollectionView.rollers
      }).render();

      // mobileResizer.reset();

      // Prevent Header & Footer From Showing Browser Chrome
      // document.addEventListener('touchmove', function(event) {
      //    if(event.target.parentNode.className.indexOf('noBounce') != -1 || event.target.className.indexOf('noBounce') != -1 ) {
      //   event.preventDefault(); }
      // }, false);
    }
  });

  new NativeChatRouter();

});
