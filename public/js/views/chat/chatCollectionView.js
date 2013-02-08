/*jshint unused:true browser:true*/
define([
  'jquery',
  'underscore',
  'marionette',
  'views/base',
  'hbs!./tmpl/chatViewItem'
], function($, _, Marionette, TroupeViews, chatItemTemplate) {
  "use strict";

  var PAGE_SIZE = 50;

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
      $(window).on('scroll', this.chatWindowScroll);
    },

    beforeClose: function() {
      $(window).off('scroll', this.chatWindowScroll);
    },

    chatWindowScroll: function() {
      if($(window).scrollTop() == $(document).height() - $(window).height()) {
        this.loadNextMessages();
      }
    },

    loadNextMessages: function() {
      if(this.loading) return;

      var self = this;
      this.loading = true;
      function success(data/*, resp*/) {
        self.loading = false;
        if(!data.length) {
          $(window).off('scroll', self.chatWindowScroll);
          return;
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
