require([
  'jquery',
  'backbone',
  'utils/context',
  'components/live-context',
  'log!router-chat',
  'views/app/chatIntegratedView',
  'views/chat/chatCollectionView',
  'collections/instances/integrated-items',

  'components/unread-items-client',
  'components/helpShareIfLonely',

  'views/chat/decorators/webhookDecorator',
  'views/chat/decorators/issueDecorator',
  'views/chat/decorators/commitDecorator',
  'views/chat/decorators/mentionDecorator',
  'views/chat/decorators/embedDecorator',
  'views/chat/decorators/emojiDecorator',
  'views/app/unreadBannerView',
  'views/app/historyLimitView',

  'views/app/headerView',

  'components/statsc',          // No ref
  'views/widgets/preload',      // No ref
  'filtered-collection',        // No ref
  'components/dozy',            // Sleep detection No ref
  'template/helpers/all',       // No ref
  'components/eyeballs',        // No ref
  'components/bug-reporting',   // No ref
  'components/csrf',            // No ref
  'components/ajax-errors',     // No ref
  'components/focus-events'     // No ref

], function($, Backbone, context, liveContext, log, ChatIntegratedView, ChatCollectionView, itemCollections, unreadItemsClient,
    helpShareIfLonely, webhookDecorator, issueDecorator, commitDecorator, mentionDecorator, embedDecorator, emojiDecorator,
    UnreadBannerView, HistoryLimitView, HeaderView) {
  "use strict";

  $(document).on("click", "a", function(e) {
    if(this.href) {
      var href = $(this).attr('href');
      if(href.indexOf('#') === 0) {
        e.preventDefault();
        window.location = href;
      }
    }

    return true;
  });

  // When a user clicks an internal link, prevent it from opening in a new window
  $(document).on("click", "a.link", function(e) {
    var basePath = context.env('basePath');
    var href = e.target.getAttribute('href');
    if(!href || href.indexOf(basePath) !== 0) {
      return;
    }

    e.preventDefault();
    window.parent.location.href = href;
  });

  var appView = new ChatIntegratedView({ el: 'body' });

  new HeaderView({ model: context.troupe(), el: '#header' });

  // Setup the ChatView
  var chatCollectionView = new ChatCollectionView({
    el: $('.js-chat-container'),
    collection: itemCollections.chats,
    userCollection: itemCollections.users,
    decorators: [webhookDecorator, issueDecorator, commitDecorator, mentionDecorator, embedDecorator, emojiDecorator]
  }).render();

  var unreadChatsModel = unreadItemsClient.acrossTheFold();

  new UnreadBannerView.Top({
    el: '#unread-banner',
    model: unreadChatsModel,
    chatCollectionView: chatCollectionView
  }).render();

  new UnreadBannerView.Bottom({
    el: '#bottom-unread-banner',
    model: unreadChatsModel,
    chatCollectionView: chatCollectionView
  }).render();

  new HistoryLimitView.Top({
    el: '#limit-banner',
    collection: itemCollections.chats,
    chatCollectionView: chatCollectionView
  }).render();

  var Router = Backbone.Router.extend({
    routes: {
      "": "hideModal",
    },

    hideModal: function() {
      appView.dialogRegion.close();
    }
  });

  var router = new Router();

  // Listen for changes to the room
  liveContext.syncRoom();
  
  //helpShareIfLonely();
  Backbone.history.start();
});
