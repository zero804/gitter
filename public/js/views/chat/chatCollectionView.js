/*jshint unused:true browser:true*/
define([
  'jquery',
  'underscore',
  'marionette',
  'views/base',
  'hbs!./tmpl/chatViewItem'
], function($, _, Marionette, TroupeViews, chatItemTemplate) {
  "use strict";

  var PAGE_SIZE = 15;

  var ChatViewItem = TroupeViews.Base.extend({
    unreadItemType: 'chat',
    template: chatItemTemplate,

    events: {
    },

    safe: function(text) {
      return (''+text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
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

  var ChatCollectionView = Marionette.CollectionView.extend({
    itemView: ChatViewItem,
    chatMessageLimit: PAGE_SIZE,

    initialize: function() {
      _.bindAll(this, 'chatWindowScroll');
      this.initializeSorting();
      var self = this;
      this.on('after:item:added', function() { self.afterItemAdded(); });
      this.on('before:item:added', function() { self.beforeItemAdded(); });

      if (window._troupeCompactView) {
        this.scrollOf = $('#chat-wrapper');
        this.container = $('#chat-frame');
      } else {
        this.scrollOf = window;
        this.container = document;
      }
      $(this.scrollOf).on('scroll', this.chatWindowScroll);
   },

    beforeClose: function() {
      $(this.scrollOf).off('scroll', this.chatWindowScroll);
    },

    onRender: function() {
      console.log("scrollOf scroll: " + $(this.scrollOf).scrollTop() + " container height: " + $(this.container).height());
      $(this.scrollOf).scrollTop($(this.container).height());

    },

    afterItemAdded: function(view) {

      if (this.isAtBottomOfPage) {
        // stay at the bottom
        $(this.scrollOf).scrollTop($(this.container).height());
      }
      else if (this.firstEl) {
        // keep current position if we are loading more
        console.log("resetting to position of firstEl");
        $(this.scrollOf).scrollTop(this.firstEl.offset().top - this.curOffset);
      }

    },

    beforeItemAdded: function() {
      //this.firstEl = this.$el[0];
      this.isAtBottomOfPage = $(this.scrollOf).scrollTop() === $(this.container).height() - $(this.scrollOf).height();
      //console.log('scrolltop' + this.isAtBottomOfPage + ' ');
    },

    chatWindowScroll: function() {
      console.log("scrolling outside");
      if($(this.scrollOf).scrollTop() === 0) {
        console.log("scrolling inside");
        this.loadNextMessages();
      }
    },

    loadNextMessages: function() {
      if(this.loading) return;

      // if there are no chat items in the view, don't try save the curOffset
      if (this.$el.find('>').length) {
        this.firstEl = this.$el.find(':first');
        this.curOffset = this.firstEl.offset().top - $(this.container).scrollTop();
        console.log("Loading more messages. Saving curOffset " + this.curOffset);
      }

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
