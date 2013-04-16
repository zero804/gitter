/*jshint unused:true, browser:true */
define([
  'jquery',
  'underscore',
  'log!chat-collection-view',
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
    isEditing: false,

    events: {
      'click .trpChatEdit': 'toggleEdit',
      'keydown .trpChatInputBoxTextArea': 'detectReturn'
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
    },

    detectReturn: function(e) {
      if(e.keyCode == 13 && !e.ctrlKey) {
        this.saveChat();
      }
    },

    saveChat: function() {
      var newText = this.$el.find('.trpChatInputBoxTextArea').val();
      if (this.canEdit() && newText != this.model.get('text')) {
        this.model.set('text', newText);
        this.model.save();
        this.toggleEdit();
      }
    },

    isOwnMessage: function() {
      return this.model.get('fromUser').id === window.troupeContext.user.id;
    },

    isInEditablePeriod: function() {
      var age = (Date.now() - this.model.get('sent').valueOf()) / 1000;
      return age <= 240;
    },

    canEdit: function() {
      return this.isOwnMessage() && this.isInEditablePeriod();
    },

    toggleEdit: function() {
      if (this.isEditing) {
        this.isEditing = false;
        this.$el.find('.trpChatText').html(this.model.get('text'));
      } else {
        if (this.canEdit()) {
          this.isEditing = true;
          this.$el.find('.trpChatText').html("<textarea class='trpChatInputBoxTextArea'>"+this.model.get('text')+"</textarea>");
        } else if (!this.isOwnMessage()) {
          window.alert("You cannot edit a messages that wasn't sent by you.");
        } else if (!this.isInEditablePeriod()) {
          window.alert("You cannot edit a message that is older than 5 minutes.");
        }

      }
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
