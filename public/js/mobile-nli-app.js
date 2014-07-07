require([
  'jquery',
  'utils/appevents',
  'collections/chat',
  'views/chat/chatCollectionView',
  'backbone',
  'components/modal-region',
  'views/app/mobileAppView',
  'views/chat/decorators/emojiDecorator',
  'views/mobile/mobileLoginButton',
  'components/csrf'                             // No ref
  ], function($, appEvents, chatModels, ChatCollectionView,
    Backbone, modalRegion, MobileAppView, emojiDecorator, MobileLoginButton) {
  "use strict";

  new MobileAppView({
    el: '#mainPage',
    hideMenu: true
  });

  appEvents.on('navigation', function(url) {
    window.location.href = url;
  });

  var chatCollection = new chatModels.ChatCollection();
  chatCollection.listen();

  new ChatCollectionView({
    el: '#frame-chat',
    collection: chatCollection,
    decorators: [emojiDecorator]
  }).render();

  new MobileLoginButton({
    el: '#chat-input',
  }).render();

  var Router = Backbone.Router.extend({
    routes: {
      "": "hideModal"
    },

    hideModal: function() {
      modalRegion.close();
    },
  });

  new Router();

  $('html').removeClass('loading');

  Backbone.history.start();

});
