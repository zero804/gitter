define([
  'jquery',
  'utils/context',
  'marionette',
  'collections/instances/integrated-items',
  'components/modal-region',
  'utils/scrollbar-detect',
  'views/chat/chatCollectionView',
  'views/chat/decorators/webhookDecorator',
  'views/chat/decorators/issueDecorator',
  'views/chat/decorators/commitDecorator',
  'views/chat/decorators/mentionDecorator',
  'views/chat/decorators/embedDecorator',
  'views/chat/decorators/emojiDecorator',
  'views/app/headerView'
], function($, context, Marionette, itemCollections, modalRegion, hasScrollBars,  ChatCollectionView,
    webhookDecorator, issueDecorator, commitDecorator, mentionDecorator, embedDecorator,
    emojiDecorator, HeaderView /*, SearchView*/) {
  "use strict";

  // Nobody knows why this is here. Delete it
  // $('.trpDisplayPicture').tooltip('destroy');

  var ChatLayout = Marionette.Layout.extend({
    el: 'body',
    leftmenu: false,
    rightpanel: false,
    profilemenu: false,
    shifted: false,
    alertpanel: false,
    files: false,
    originalRightMargin: "",

    ui: {
      scrollToBottom: '.js-scroll-to-bottom'
    },

    regions: {
    },

    initialize: function() {

      this.bindUIElements();

      // Setup the ChatView - this is instantiated once for the application, and shared between many views
      var chatCollectionView = new ChatCollectionView({
        el: '#chat-container',
        collection: itemCollections.chats,
        userCollection: itemCollections.users,
        decorators: [webhookDecorator, issueDecorator, commitDecorator, mentionDecorator, embedDecorator, emojiDecorator]
      }).render();

      this.listenTo(itemCollections.chats, 'atBottomChanged', function (isBottom) {
        this.ui.scrollToBottom.toggleClass('u-scale-zero', isBottom);
      }.bind(this));

      new HeaderView({ model: context.troupe(), el: '#header' });

      this.chatCollectionView = chatCollectionView;
      this.dialogRegion = modalRegion;

      if (hasScrollBars()) {
        $(".primary-scroll").addClass("scroller");
        $(".js-chat-input-container").addClass("scrollpush");
        $("#room-content").addClass("scroller");
      }
    }
  });

  return ChatLayout;
});
