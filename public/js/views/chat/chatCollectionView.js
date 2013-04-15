/*jshint unused:true, browser:true */
define([
  'jquery',
  'underscore',
  'utils/log',
  'components/unread-items-client',
  'marionette',
  'views/base',
  './scrollDelegate',
  'hbs!./tmpl/chatViewItem'
], function($, _, log, unreadItemsClient, Marionette, TroupeViews, scrollDelegates, chatItemTemplate) {
  "use strict";

  var PAGE_SIZE = 15;

  var ChatViewItem = TroupeViews.Base.extend({
    unreadItemType: 'chat',
    template: chatItemTemplate,

    events: {
    },

    safe: function(text) {
      return (''+text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;').replace(/\n\r?/g, '<br />');
    },

    getRenderData: function() {
      var data = this.model.toJSON();

      // We need to parse the text a little to hyperlink known links and escape html to prevent injection
      data.text = this.safe(data.text);

      var current = data.fromUser.id == window.troupeContext.user.id;

      data.displayName = data.fromUser.displayName;

      /* TODO: css selectors should be able to handle this from a single class on a parent div */
      if(current) {
        data.chatRowClass = 'trpChatRow';
        data.chatRowPictureClass = 'trpChatPictureLocal';
        data.chatBubbleAdditional = 'local';
      } else {
        data.chatRowClass = 'trpChatRowRemote';
        data.chatRowPictureClass = 'trpChatPictureRemote';
        data.chatBubbleAdditional = 'remote';
      }

      return data;
    }

  });

  /*
  * View
  */
  var ChatCollectionView = Marionette.CollectionView.extend({
    itemView: ChatViewItem,
    chatMessageLimit: PAGE_SIZE,

    initialize: function() {
      _.bindAll(this, 'chatWindowScroll');
      this.initializeSorting();

      if (window._troupeCompactView) {
        this.$scrollOf = $('#chat-wrapper');
        this.$container = $('#chat-frame');
      } else {
        this.$scrollOf = $(window);
        this.$container = $(document);
      }

      this.scrollDelegate = new scrollDelegates.DefaultScrollDelegate(this.$scrollOf, this.$container, this.collection.modelName, findTopMostVisibleUnreadItem);
      this.infiniteScrollDelegate = new scrollDelegates.InfiniteScrollDelegate(this.$scrollOf, this.$container, this.collection.modelName, findTopMostVisibleUnreadItem);
      this.$scrollOf.on('scroll', this.chatWindowScroll);

      function findTopMostVisibleUnreadItem(itemType) {
        return unreadItemsClient.findTopMostVisibleUnreadItemPosition(itemType);
      }

    },

    onClose: function(){
      $(document).off('eyeballStateChange', this.eyeballStateChange);
    },

    beforeClose: function() {
      this.$scrollOf.off('scroll', this.chatWindowScroll);
    },

    onRender: function() {
      // log("scrollOf scroll: " + this.$scrollOf.scrollTop() + " container height: " + this.$container.height());
      // this is an ugly hack to deal with some weird timing issues
      var self = this;
      setTimeout(function() {
        // note: on mobile safari this only work when typing in the url, not when pressing refresh, it works well in the mobile app.
        self.scrollDelegate.scrollToBottom();
      }, 500);
    },

    onAfterItemAdded: function(item) {
      if (!this.loading) {
        this.scrollDelegate.onAfterItemAdded(item);
      }
    },

    onBeforeItemAdded: function() {
      if (!this.loading) {
        this.scrollDelegate.onBeforeItemAdded();
      }
    },

    chatWindowScroll: function() {
      if (this.hasScrolled && this.$scrollOf.scrollTop() === 0) {
        this.loadNextMessages();
      }
      this.hasScrolled = true;
    },

    loadNextMessages: function() {
      if(this.loading) return;

      this.infiniteScrollDelegate.beforeLoadNextMessages();

      var self = this;
      this.loading = true;
      function success(data, resp) {
        self.loading = false;
        if(!resp.length) {
          $(self.scrollOf).off('scroll', self.chatWindowScroll);
        }
      }

      function error() {
        self.loading = false;
      }

      this._testLoading = true;
      this.collection.once('sync', function() {
        this._testLoading = false;
        self.infiniteScrollDelegate.afterLoadNextMessages();
        console.log('LOAD IS COMPLETE');
      });
      this.collection.fetch({
        update: true,
        add: true,
        remove: false, // chat messages are never deleted
        data: {
          skip: this.collection.length,
          limit: this.chatMessageLimit
        },
        success: success,
        error: error
      });

    }

  });

  _.extend(ChatCollectionView.prototype, TroupeViews.SortableMarionetteView);

  return ChatCollectionView;
});
