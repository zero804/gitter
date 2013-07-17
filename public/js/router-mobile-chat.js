/*jshint strict:true, undef:true, unused:strict, browser:true *//* global require:false */
require([
  'jquery',
  'views/base',
  'collections/chat',
  'views/chat/chatInputView',
  'views/chat/chatCollectionView',
  'views/widgets/avatar',
  'components/mobile-context',        // No ref
  'components/eyeballs',              // No ref
  'components/unread-items-client',   // No ref
  'template/helpers/all'              // No ref
], function($, TroupeViews, chatModels, chatInputView, ChatCollectionView, AvatarWidget /*, mobileContext, eyeballsClient, unreadItemsClient */) {
  "use strict";

  var PAGE_SIZE = 15;

  TroupeViews.preloadWidgets({
    avatar: AvatarWidget
  });


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


  $('.trpMobileAmuseIcon').click(function() {
    document.location.reload(true);
  });

  // Prevent Header & Footer From Showing Browser Chrome

  document.addEventListener('touchmove', function(event) {
     if(event.target.parentNode.className.indexOf('noBounce') != -1 || event.target.className.indexOf('noBounce') != -1 ) {
    event.preventDefault(); }
  }, false);

  // Asynchronously load tracker
  require([
    'utils/tracking'
  ], function() {
    // No need to do anything here
  });

});
