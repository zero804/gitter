/*jshint unused:true, browser:true */
define([
  'jquery',
  'underscore',
  'log!chat-collection-view',
  'components/unread-items-client',
  'marionette',
  'views/base',
  './scrollDelegate',
  'hbs!./tmpl/chatViewItem',
  'bootstrap_tooltip'
], function($, _, log, unreadItemsClient, Marionette, TroupeViews, scrollDelegates, chatItemTemplate) {
  "use strict";

  var PAGE_SIZE = 15;

  var ChatViewItem = TroupeViews.Base.extend({
    unreadItemType: 'chat',
    template: chatItemTemplate,
    isEditing: false,

    events: {
      'click .trpChatEdit': 'toggleEdit',
      'keydown .trpChatInput': 'detectReturn'
    },

    initialize: function() {
      var self = this;

      this.setRerenderOnChange(true);

      if (this.isInEditablePeriod()) {
        // re-render once the message is not editable
        var notEditableInMS = (this.model.get('sent').valueOf() + 240000) - Date.now();
        setTimeout(function() {
          self.render();
        }, notEditableInMS + 50);
      }

      // dblclick / doubletap don't seem to work on mobile even with user-scalable=no
      /*
      if (window._troupeCompactView) {
        this.$el.on('dblclick', function() {
          self.toggleEdit();
        });
      }*/
    },
    /*
    stopListening: function() {
      if (!arguments.length)
        this.$el.off('dblclick');
      else
        TroupeViews.Base.prototype.stopListening.apply(this, arguments);
    },
    */
    safe: function(text) {
      return (''+text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;').replace(/\n\r?/g, '<br />');
    },

    getRenderData: function() {
      var data = this.model.toJSON();

      data.isViewers = this.isOwnMessage();
      data.isInEditablePeriod = this.isInEditablePeriod();
      data.canEdit = this.canEdit();
      data.hasBeenEdited = this.hasBeenEdited();

      data.editIconTooltip = (this.hasBeenEdited()) ? "Edited shortly after being sent": ((this.canEdit()) ? "Edit within 4 minutes of sending" : "It's too late to edit this message.");

      // We need to parse the text a little to hyperlink known links and escape html to prevent injection
      data.text = this.safe(data.text);

      data.displayName = data.fromUser.displayName;

      /* TODO: css selectors should be able to handle this from a single class on a parent div */
      if(data.isViewers) {
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

    afterRender: function() {
      this.$el.toggleClass('isViewers', this.isOwnMessage());
      this.$el.toggleClass('isEditable', this.isInEditablePeriod());
      this.$el.toggleClass('canEdit', this.canEdit());
      this.$el.toggleClass('hasBeenEdited', this.hasBeenEdited());
      //this.$el.tooltip();
    },

    detectReturn: function(e) {
      if(e.keyCode == 13 && !e.ctrlKey) {
        this.saveChat();
      }
    },

    saveChat: function() {
      var newText = this.$el.find('.trpChatInput').val();
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

    hasBeenEdited: function() {
      return !!this.model.get('editedAt');
    },

    toggleEdit: function() {
      if (this.isEditing) {
        this.isEditing = false;
        this.$el.find('.trpChatText').html(this.model.get('text'));
      } else {
        if (this.canEdit()) {
          this.isEditing = true;
          var isAtBottom = ChatCollectionView.$scrollOf.scrollTop() >= (ChatCollectionView.$container.height() - ChatCollectionView.$scrollOf.height());
          this.$el.find('.trpChatText').html("<textarea class='trpChatInput'>"+this.model.get('text')+"</textarea>");
          this.$el.find('.trpChatText textarea').focus();
          if (isAtBottom) {
            ChatCollectionView.$scrollOf.scrollTop(ChatCollectionView.$container.height() - ChatCollectionView.$scrollOf.height());
          }
        } else if (!this.isOwnMessage()) {
          // window.alert("You cannot edit a messages that wasn't sent by you.");
        } else if (!this.isInEditablePeriod()) {
          // window.alert("You cannot edit a message that is older than 5 minutes.");
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
        ChatCollectionView.$scrollOf = $('#chat-wrapper');
        ChatCollectionView.$container = $('#chat-frame');
      } else {
        ChatCollectionView.$scrollOf = $(window);
        ChatCollectionView.$container = $(document);
      }

      this.scrollDelegate = new scrollDelegates.DefaultScrollDelegate(ChatCollectionView.$scrollOf, ChatCollectionView.$container, this.collection.modelName, findTopMostVisibleUnreadItem);
      this.infiniteScrollDelegate = new scrollDelegates.InfiniteScrollDelegate(ChatCollectionView.$scrollOf, ChatCollectionView.$container, this.collection.modelName, findTopMostVisibleUnreadItem);
      ChatCollectionView.$scrollOf.on('scroll', this.chatWindowScroll);

      function findTopMostVisibleUnreadItem(itemType) {
        return unreadItemsClient.findTopMostVisibleUnreadItemPosition(itemType);
      }

    },

    onClose: function(){
      $(document).off('eyeballStateChange', this.eyeballStateChange);
    },

    beforeClose: function() {
      ChatCollectionView.$scrollOf.off('scroll', this.chatWindowScroll);
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
      if (this.hasScrolled && ChatCollectionView.$scrollOf.scrollTop() === 0) {
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
          $(ChatCollectionView.$scrollOf).off('scroll', self.chatWindowScroll);
        }
      }

      function error() {
        self.loading = false;
      }

      this._testLoading = true;
      this.collection.once('sync', function() {
        this._testLoading = false;
        self.infiniteScrollDelegate.afterLoadNextMessages();
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
