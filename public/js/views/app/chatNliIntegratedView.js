"use strict";
var $ = require('jquery');
var Marionette = require('marionette');
var modalRegion = require('components/modal-region');
var hasScrollBars = require('utils/scrollbar-detect');

var ChatCollectionView = require('views/chat/chatCollectionView');

var webhookDecorator = require('views/chat/decorators/webhookDecorator');
var issueDecorator = require('views/chat/decorators/issueDecorator');
var commitDecorator = require('views/chat/decorators/commitDecorator');
var mentionDecorator = require('views/chat/decorators/mentionDecorator');
var embedDecorator = require('views/chat/decorators/embedDecorator');
var emojiDecorator = require('views/chat/decorators/emojiDecorator');

module.exports = (function() {


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

    initialize: function(options) {
      this.bindUIElements();

      this.chatCollection = options.chatCollection;
      this.userCollection = options.userCollection;

      this.listenTo(this.chatCollection, 'atBottomChanged', function (isBottom) {
        this.ui.scrollToBottom.toggleClass('u-scale-zero', isBottom);
      });

      var chatCollectionView = new ChatCollectionView({
        el: '#chat-container',
        collection: this.chatCollection,
        userCollection: this.userCollection,
        decorators: [
          webhookDecorator,
          issueDecorator,
          commitDecorator,
          mentionDecorator,
          embedDecorator,
          emojiDecorator
        ]
      });
      chatCollectionView.bindUIElements();


      this.dialogRegion = modalRegion;

      if (hasScrollBars()) {
        $(".primary-scroll").addClass("scroller");
        $(".js-chat-input-container").addClass("scrollpush");
        $("#room-content").addClass("scroller");
      }
    }
  });

  return ChatLayout;

})();
