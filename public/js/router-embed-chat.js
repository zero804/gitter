require([
  'jquery',
  'backbone',
  'utils/context',
  'log!router-chat',
  'views/app/chatIntegratedView',
  'views/chat/chatCollectionView',
  'collections/instances/integrated-items',

  'views/chat/decorators/webhookDecorator',
  'views/chat/decorators/issueDecorator',
  'views/chat/decorators/commitDecorator',
  'views/chat/decorators/mentionDecorator',
  'views/chat/decorators/embedDecorator',
  'views/chat/decorators/emojiDecorator',
  'views/app/historyLimitView',

  'components/statsc',          // No ref
  'views/widgets/preload',      // No ref
  'components/dozy',            // Sleep detection No ref
  'template/helpers/all',       // No ref
  'components/bug-reporting',   // No ref
  'components/ajax-errors',     // No ref

], function($, Backbone, context, log, ChatIntegratedView, ChatCollectionView, itemCollections,
  webhookDecorator, issueDecorator, commitDecorator, mentionDecorator, embedDecorator, emojiDecorator,
  HistoryLimitView) {
  
  "use strict";

  new ChatIntegratedView({ el: 'body' });

  var chatCollectionView = new ChatCollectionView({
    el: $('.js-chat-container'),
    collection: itemCollections.chats,
    userCollection: itemCollections.users,
    decorators: [webhookDecorator, issueDecorator, commitDecorator, mentionDecorator, embedDecorator, emojiDecorator],
  }).render();
  
  itemCollections.chats.on('add', function (item) {
    setTimeout(item.set.bind(item, 'unread', false), 500);
  });

  new HistoryLimitView.Top({
    el: '#limit-banner',
    collection: itemCollections.chats,
    chatCollectionView: chatCollectionView
  }).render();
  
});
