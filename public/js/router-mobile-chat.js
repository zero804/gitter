/*jshint unused:true browser:true*/
require([
  'jquery',
  'underscore',
  'backbone',
  'views/base',
  'collections/chat',
  'views/chat/chatInputView',
  'views/chat/chatCollectionView'
], function($, _, Backbone, TroupeViews, chatModels, ChatInputView, ChatCollectionView) {
  "use strict";

    // Setup the ChatView
  var chatCollection = new chatModels.ChatCollection();
  chatCollection.setSortBy('-sent');
  chatCollection.listen();
  chatCollection.reset(window.troupePreloads['chatMessages'], { parse: true });

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
