/* jshint unused:true, browser:true,  strict:true */
/* global define:false */
define([
  'jquery',
  'underscore',
  'utils/context',
  'log!chat-collection-view',
  'collections/chat',
  'views/widgets/avatar',
  'components/unread-items-client',
  'marionette',
  'views/base',
  './scrollDelegate',
  'hbs!./tmpl/chatViewItem',
  'views/chat/chatInputView',
  'bootstrap_tooltip'
], function($, _, context, log, chatModels, AvatarView, unreadItemsClient, Marionette, TroupeViews, scrollDelegates, chatItemTemplate, chatInputView /* tooltip*/) {

  "use strict";

  var PAGE_SIZE = 15;

  var ChatViewItem = TroupeViews.Base.extend({
    unreadItemType: 'chat',
    template: chatItemTemplate,
    isEditing: false,

    events: {
      'click .trpChatEdit':     'toggleEdit',
      'keydown textarea':  'detectEscape',
      'click .trpChatReads':    'showReadBy'
    },

    initialize: function(options) {
      var self = this;

      this.setRerenderOnChange(true);
      this.userCollection = options.userCollection;
      this.scrollDelegate = options.scrollDelegate;

      if (this.isInEditablePeriod()) {
        // re-render once the message is not editable
        var notEditableInMS = (this.model.get('sent').valueOf() + 240000) - Date.now();
        setTimeout(function() {
          self.render();
        }, notEditableInMS + 50);
      }

      if (!this.isOld()) {
        var oldInMS = (this.model.get('sent').valueOf() + 3600000 /*1 hour*/) - Date.now();
        setTimeout(function() {
          self.render();
        }, oldInMS + 50);
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
      this.$el.toggleClass('cantEdit', !this.canEdit());
      this.$el.toggleClass('hasBeenEdited', this.hasBeenEdited());
      this.$el.toggleClass('hasBeenRead', this.hasBeenRead());
      this.$el.toggleClass('isOld', this.isOld());

      if (!window._troupeCompactView) {
        this.$el.find('.trpChatEdit [title]').tooltip({ container: 'body' });
      }
    },

    detectKeys: function(e) {
      this.detectReturn(e);
      this.detectEscape(e);
    },

    detectReturn: function(e) {
      if(e.keyCode === 13 && !e.ctrlKey) {
        // found submit
        this.saveChat();
        e.stopPropagation();
        e.preventDefault();
      }
    },

    detectEscape: function(e) {
      if (e.keyCode === 27) {
        // found escape, cancel edit
        this.toggleEdit();
      }
    },

    saveChat: function(newText) {
      if (this.isEditing) {
        if (this.canEdit() && newText != this.model.get('text')) {
          this.model.set('text', newText);
          this.model.save();
        }

        this.toggleEdit();
      }
    },

    isOwnMessage: function() {
      return this.model.get('fromUser').id === context.getUserId();
    },

    isInEditablePeriod: function() {
      var age = (Date.now() - this.model.get('sent').valueOf()) / 1000;
      return age <= 240;
    },

    isOld: function() {
      var age = (Date.now() - this.model.get('sent').valueOf()) / 1000;
      return age >= 3600;
    },

    canEdit: function() {
      return this.isOwnMessage() && this.isInEditablePeriod();
    },

    hasBeenEdited: function() {
      return !!this.model.get('editedAt');
    },

    hasBeenRead: function() {
      return !!this.model.get('readBy');
    },

    toggleEdit: function() {
      var self = this;
      if (this.isEditing) {
        this.isEditing = false;
        this.showText();
      } else {
        if (this.canEdit()) {
          this.isEditing = true;
          this.showInput();
        } else if (!this.isOwnMessage()) {
          // window.alert("You cannot edit a messages that wasn't sent by you.");
        } else if (!this.isInEditablePeriod()) {
          // window.alert("You cannot edit a message that is older than 5 minutes.");
        }
      }
    },

    showText: function() {
      this.$el.find('.trpChatText').html(this.model.get('text').replace(/\n/g,"<br/>"));

      if (this.inputBox) {
        this.stopListening(this.inputBox);
        delete this.inputBox;
      }

    },

    showInput: function() {
      var isAtBottom = this.scrollDelegate.isAtBottom();

      // create inputview
      this.$el.find('.trpChatText').html("<textarea class='trpChatInput'>"+this.model.get('text')+"</textarea>").find('textarea').select();
      this.inputBox = new chatInputView.ChatInputBoxView({ el: this.$el.find('textarea'), scrollDelegate: this.scrollDelegate });
      this.listenTo(this.inputBox, 'save', this.saveChat);

      // this.$el.find('.trpChatText textarea').focus().on('blur', function() { self.toggleEdit(); });
      if (isAtBottom) {
        this.scrollDelegate.scrollToBottom();
      }
    },

    showReadBy: function() {
      if(this.readBy) return;

      this.readBy = new ReadByPopover({
        model: this.model,
        userCollection: this.userCollection,
        placement: 'bottom',
        title: 'Read By',
        targetElement: this.$el.find('.trpChatReads')[0]
      });

      var s = this;
      this.readBy.once('hide', function() {
        s.readBy = null;
      });

      this.readBy.show();

    }

  });

  var ReadByView = Marionette.CollectionView.extend({
    itemView: AvatarView,
    initialize: function(options) {
      var c = new chatModels.ReadByCollection([], { chatMessageId: this.model.id, userCollection: options.userCollection });
      c.loading = true;
      this.collection = c;
      c.listen(function() {
        c.fetch();
      });
    },
    onClose: function(){
      this.collection.unlisten();
    }
  });
  _.extend(ReadByView.prototype, TroupeViews.LoadingCollectionMixin);

  var ReadByPopover = TroupeViews.Popover.extend({
    initialize: function(options) {
      TroupeViews.Popover.prototype.initialize.apply(this, arguments);
      this.view = new ReadByView({ model: this.model, userCollection: options.userCollection });
    }
  });

  /*
  * View
  */
  var ChatCollectionView = Marionette.CollectionView.extend({
    itemView: ChatViewItem,
    itemViewOptions: function() {
      return { userCollection: this.userCollection, scrollDelegate: this.scrollDelegate };
    },
    chatMessageLimit: PAGE_SIZE,

    initialize: function(options) {
      _.bindAll(this, 'chatWindowScroll');
      this.initializeSorting();

      this.userCollection = options.userCollection;

      if (window._troupeCompactView) {
        ChatCollectionView.$scrollOf = $('#chat-wrapper');
        ChatCollectionView.$container = $('#chat-frame');
      } else {
        ChatCollectionView.$scrollOf = $(window);
        ChatCollectionView.$container = $(document);
      }

      this.scrollDelegate = new scrollDelegates.DefaultScrollDelegate(ChatCollectionView.$scrollOf, ChatCollectionView.$container, this.collection.modelName, findTopMostUnreadItem);
      this.infiniteScrollDelegate = new scrollDelegates.InfiniteScrollDelegate(ChatCollectionView.$scrollOf, ChatCollectionView.$container, this.collection.modelName, findTopMostUnreadItem);

      function findTopMostUnreadItem(itemType) {
        return unreadItemsClient.findTopMostUnreadItemPosition(itemType, ChatCollectionView.$container, ChatCollectionView.$scrollOf);
      }

      var self = this;
      // wait for the first reset (preloading) before enabling infinite scroll
      // and scroll to bottom once the first rendering is complete
      if (this.collection.length === 0) {
        var eventEnabled = false;
        this.collection.once('sync', function() {
          if(eventEnabled) return;
          eventEnabled = true;

          ChatCollectionView.$scrollOf.on('scroll', self.chatWindowScroll);
          self.scrollDelegate.scrollToBottom();
        });
      } else {
        // log("Enabling infinite scroll");
        ChatCollectionView.$scrollOf.on('scroll', self.chatWindowScroll);
        self.scrollDelegate.scrollToBottom();
      }
    },

    onClose: function(){
      $(document).off('eyeballStateChange', this.eyeballStateChange);
    },

    beforeClose: function() {
      ChatCollectionView.$scrollOf.off('scroll', this.chatWindowScroll);
    },

    onRender: function() {
      // this is also done in initialize on collection sync event

      // log("scrollOf scroll: " + this.$scrollOf.scrollTop() + " container height: " + this.$container.height());
      // this is an ugly hack to deal with some weird timing issues
      var self = this;
      setTimeout(function() {
        // note: on mobile safari this only work when typing in the url, not when pressing refresh, it works well in the mobile app.
        // log("Initial scroll to bottom on page load");
        self.scrollDelegate.scrollToBottom();
      }, 500);
    },

    onAfterItemAdded: function(item) {
      // log("After an item was added");
      // this must only be called for when new messages are received (at the bottom), not while loading the collection
      if (!this.collection.isLoading()) {
        this.scrollDelegate.onAfterItemAdded(item);
      }
    },

    onBeforeItemAdded: function() {
      if (!this.collection.isLoading()) {
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
      if(this.collection.isLoading()) return;

      // log("Loading next message chunk.");
      this.infiniteScrollDelegate.beforeLoadNextMessages();

      var self = this;
      function success(data, resp) {
        if(!resp.length) {
          // turn off infinite scroll if there were no new messages retrieved
          $(ChatCollectionView.$scrollOf).off('scroll', self.chatWindowScroll);
        }
      }

      this.collection.once('sync', function() {
        self.infiniteScrollDelegate.afterLoadNextMessages();
      });

      var ids = this.collection.map(function(m) { return m.get('id'); });
      var lowestId = _.min(ids, function(a, b) {
        if(a < b) return -1;
        if(a > b) return 1;
        return 0;
      });

      if(lowestId === Infinity) {
        log('No messages loaded, cancelling pagenation (!!)');
        return;
      }

      this.collection.fetch({
        update: true,
        add: true,
        remove: false, // chat messages are never deleted
        data: {
          beforeId: lowestId,
          limit: this.chatMessageLimit
        },
        success: success
      });

    }

  });

  _.extend(ChatCollectionView.prototype, TroupeViews.SortableMarionetteView);

  return ChatCollectionView;
});
