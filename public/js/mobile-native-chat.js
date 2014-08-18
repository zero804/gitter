require([
  'jquery',
  'utils/context',
  'components/cordova-navigate',
  'collections/chat',
  'collections/users',
  'views/chat/chatCollectionView',
  'views/chat/chatInputView',
  'components/unread-items-client',
  'components/cache-sync',
  'views/chat/decorators/emojiDecorator',
  'views/chat/decorators/mobileDecorator',
  'log!mobile-native-chat',
  'components/eyeballs',                        // No ref
  'components/csrf'                             // No ref
  ], function($, context, cordovaNav, chatModels, userModels, ChatCollectionView, chatInputView, unreadItemsClient, cacheSync,
    emojiDecorator, mobileDecorator, log) {

  "use strict";

  $(document).on('app.version.mismatch', function() {
    try {
      if(window.applicationCache.status == 1) {
        log('Attempting to update application cache');
        window.applicationCache.update();
      }
    } catch(e) {
      log('Unable to update application cache: ' + e, e);
    }
  });

  cordovaNav.syncNativeWithWebContext(context.troupe());

  var chatCollection = new chatModels.ChatCollection();
  cacheSync.install(chatCollection);
  chatCollection.listen();
  
  var userCollection = new userModels.UserCollection();
  userCollection.listen();

  var chatCollectionView = new ChatCollectionView({
    el: $('#content-frame'),
    collection: chatCollection,
    decorators: [emojiDecorator, mobileDecorator]
  }).render();

  unreadItemsClient.syncCollections({
    'chat': chatCollection
  });
  
  unreadItemsClient.monitorViewForUnreadItems($('#content-frame'));

  new chatInputView.ChatInputView({
    el: $('#chat-input'),
    collection: chatCollection,
    rollers: chatCollectionView.rollers,
    userCollection: userCollection
  }).render();

  $('html').removeClass('loading');

});
