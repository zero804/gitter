/*jshint unused:true browser:true */
/*global console: true */
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

    onAfterItemAdded: function() {

      if (this.isAtBottomOfPage) {
        // stay at the bottom
        $(this.scrollOf).scrollTop($(this.container).height());
      }
      else if (this.firstElBeforeLoad) {
        // keep current position if we are loading more
        // it's very difficult to get an elements co-ordinate within it's parent.
        // so we readjust the scroll according to how much it's parent has grown,
        // to be more general we could look at the displacement that the growth caused for the element,
        // so that we can figure out how much growth occurred above vs below it.
        $(this.scrollOf).scrollTop(this.scrollPosBeforeAdd + ($(this.container).height() - this.containerHeightBeforeAdd));
      }

    },

    onBeforeItemAdded: function() {
      this.isAtBottomOfPage = $(this.scrollOf).scrollTop() === $(this.container).height() - $(this.scrollOf).height();
      this.containerHeightBeforeAdd = $(this.container).height();
      this.scrollPosBeforeAdd = $(this.scrollOf).scrollTop();
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
        // store the chat item view element that is at the top of the list at this point  (before loading)
        this.firstElBeforeLoad = this.$el.find(':first');
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
