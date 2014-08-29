require([
  'views/app/chatIntegratedView',
  'views/chat/chatCollectionView',
  'collections/chat',

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

], function(ChatIntegratedView, ChatCollectionView, chatModels,
  webhookDecorator, issueDecorator, commitDecorator, mentionDecorator, embedDecorator, emojiDecorator,
  HistoryLimitView) {

  "use strict";

  new ChatIntegratedView({ el: 'body' });

  var chatCollection = new chatModels.ChatCollection(null, { listen: true });
  chatCollection.listen();

  var chatCollectionView = new ChatCollectionView({
    el: '#chat-container',
    collection: chatCollection,
    // userCollection: itemCollections.users, // do we need the user collection?
    decorators: [webhookDecorator, issueDecorator, commitDecorator, mentionDecorator, embedDecorator, emojiDecorator],
  }).render();

  chatCollection.on('add', function (item) {
    setTimeout(item.set.bind(item, 'unread', false), 500);
  });

  new HistoryLimitView({
    el: '#limit-banner',
    collection: chatCollection,
    chatCollectionView: chatCollectionView
  }).render();

});
