/*jshint strict:true, undef:true, unused:strict, browser:true *//* global require:false */
require([
  'jquery',
  'views/base',
  'utils/context',
  'collections/chat',
  'collections/requests',
  'views/chat/chatInputView',
  'views/chat/chatCollectionView',
  'views/widgets/avatar',
  'views/request/requestDialog',
  'utils/mobile-resizer',
  'components/mobile-context',        // No ref
  'components/eyeballs',              // No ref
  'components/unread-items-client',   // No ref
  'template/helpers/all'              // No ref
], function($, TroupeViews, context, chatModels, requestModels, chatInputView, ChatCollectionView, AvatarWidget, RequestResponseModal, mobileResizer /*, mobileContext, eyeballsClient, unreadItemsClient */) {
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

  mobileResizer.hideAddessBar();
  mobileResizer.resizeChatWrapperToFit();

  $('.trpMobileAmuseIcon').click(function() {
    document.location.reload(true);
  });

  // prompt response to requests
  if (!context.getTroupe().oneToOne) {
    var requests = new requestModels.RequestCollection();
    requests.on('all', promptRequest);
    requests.listen();
  }

  function promptRequest() {
    if (requests.length > 0) {
      requests.off('all', promptRequest); // nb must unsubscribe to avoid loop when saving request model.

      (new RequestResponseModal({ model: requests.at(0) })).show();
    }
  }

  // Prevent Header & Footer From Showing Browser Chrome

  document.addEventListener('touchmove', function(event) {
     if(event.target.parentNode.className.indexOf('noBounce') != -1 || event.target.className.indexOf('noBounce') != -1 ) {
    event.preventDefault(); }
  }, false);

  window.addEventListener("orientationchange", function() {
    mobileResizer.reset();
  });

  // Asynchronously load tracker
  require([
    'utils/tracking'
  ], function() {
    // No need to do anything here
  });

});
