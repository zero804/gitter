/*jshint unused:true browser:true*/
require([
  'jquery',
  'underscore',
  'backbone',
  'views/base',
  'collections/chat',
  'views/chat/chatInputView',
  'views/chat/chatCollectionView',
  'views/widgets/avatar'
], function($, _, Backbone, TroupeViews, chatModels, ChatInputView, ChatCollectionView, AvatarWidget) {
  "use strict";

  TroupeViews.preloadWidgets({
    avatar: AvatarWidget
  });

    // Setup the ChatView
  var chatCollection = new chatModels.ChatCollection();
  chatCollection.setSortBy('-sent');
  chatCollection.listen();
  chatCollection.reset(window.troupePreloads['chatMessages'], { parse: true });
  if ($(document.documentElement).attr('manifest')) {
    chatCollection.fetch();
  }

  new ChatInputView({
    el: $('#chat-input'),
    collection: chatCollection
  }).render();

  new ChatCollectionView({
    el: $('#frame-chat'),
    collection: chatCollection
  }).render();

  // Asynchronously load tracker
  require([
    'utils/tracking'
  ], function() {
    // No need to do anything here
  });

});
