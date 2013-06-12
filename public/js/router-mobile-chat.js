/*jshint unused:true, browser:true */
require([
  'jquery',
  'underscore',
  'backbone',
  'views/base',
  'collections/chat',
  'views/chat/chatInputView',
  'views/chat/chatCollectionView',
  'views/widgets/avatar',
  'components/eyeballs',
  'components/unread-items-client',
  'scrollfix'
], function($, _, Backbone, TroupeViews, chatModels, chatInputView, ChatCollectionView, AvatarWidget  /*, eyeballsClient, unreadItemsClient, scrollfix*/) {
  /*jslint browser: true, unused: true */
  "use strict";

  var PAGE_SIZE = 15;

  TroupeViews.preloadWidgets({
    avatar: AvatarWidget
  });


  var chatCollection = new chatModels.ChatCollection();
  chatCollection.listen();
  chatCollection.fetch({
    data: {
      limit: PAGE_SIZE
    }
  });

  chatCollection.newConnectionCount = 0;
  $(document).on('realtime:newConnectionEstablished', function() {
    if(chatCollection.newConnectionCount++) {
      chatCollection.fetch({
        data: {
          limit: PAGE_SIZE
        }
      });
    }
  });


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


  $('.trpMobileAmuseIcon').click(function() {
    document.location.reload(true);
  });

  // Prevent Header & Footer From Showing Browser Chrome

  document.addEventListener('touchmove', function(event) {
     if(event.target.parentNode.className.indexOf('noBounce') != -1 || event.target.className.indexOf('noBounce') != -1 ) {
    event.preventDefault(); }
  }, false);

  // Add ScrollFix
  var scrollingContent = document.getElementById("chat-wrapper");
  new ScrollFix(scrollingContent);

  // Asynchronously load tracker
  require([
    'utils/tracking'
  ], function() {
    // No need to do anything here
  });

});
