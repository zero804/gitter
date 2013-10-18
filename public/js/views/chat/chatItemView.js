/* jshint unused:true, browser:true,  strict:true */
/* global define:false */
define([
  'jquery',
  'underscore',
  'utils/context',
  'log!chat-item-view',
  'collections/chat',
  'views/widgets/avatar',
  'components/unread-items-client',
  'marionette',
  'views/base',
  'hbs!./tmpl/chatViewItem',
  'views/chat/chatInputView',
  'views/unread-item-view-mixin',
  'template/helpers/linkify',
  'utils/safe-html',
  'cocktail',
  'bootstrap_tooltip' // No ref
], function($, _, context, log, chatModels, AvatarView, unreadItemsClient, Marionette, TroupeViews,
  chatItemTemplate, chatInputView, UnreadItemViewMixin, linkify, safeHtml, cocktail /* tooltip*/) {

  "use strict";

  /** @const */
  var OLD_TIMEOUT = 3600000 /*1 hour*/;

  /** @const */
  var EDIT_WINDOW = 240000;

  var ChatItemView = TroupeViews.Base.extend({
    unreadItemType: 'chat',
    template: chatItemTemplate,
    isEditing: false,

    events: {
      'click .trpChatEdit':     'toggleEdit',
      'keydown textarea':       'detectEscape',
      'click .trpChatReadBy':   'showReadBy'
    },

    initialize: function(options) {

      this._oneToOne = context.inOneToOneTroupeContext();

      this.userCollection = options.userCollection;

      this.decorators = options.decorators;

      this.listenTo(this.model, 'change', this.onChange);

      var timeChange = this.timeChange.bind(this);
      if (this.isInEditablePeriod()) {
        // update once the message is not editable
        var notEditableInMS = this.model.get('sent').valueOf() + EDIT_WINDOW - Date.now();
        setTimeout(timeChange, notEditableInMS + 50);
      }

      if (!this.isOld()) {
        var oldInMS = this.model.get('sent').valueOf() + OLD_TIMEOUT - Date.now();
        setTimeout(timeChange, oldInMS + 50);
      }
    },

    getRenderData: function() {
      var data = this.model.toJSON();
      var isMobile = navigator.userAgent.match(/mobile/i) ? true : false;

      if (data.fromUser) {
        data.displayName = data.fromUser.displayName || data.fromUser.fallbackDisplayName;
        if (isMobile && data.displayName.length > 13) {
          data.displayName = data.fromUser.displayName.split(" ").shift();
        }
      }
      data.readByText = this.getReadByText(data.readBy);

      return data;
    },

    getReadByText: function(readByCount) {
      if(!readByCount) return '';
      if(this._oneToOne) return ' ';
      if(readByCount > 10) readByCount = 10;
      return readByCount;
    },

    onChange: function() {
      var changed = this.model.changed;
      if ('text' in changed || 'urls' in changed || 'mentions' in changed) {
        this.renderText();
      }

      this.updateRender(this.model.changed);
    },

    renderText: function() {
      // We need to parse the text a little to hyperlink known links and escape html to prevent injection
      var richText = linkify(this.model.get('text'), this.model.get('urls')).toString();
      richText = richText.replace(/\n\r?/g, '<br>');
      this.$el.find('.trpChatText').html(richText);

      this.highlightMention();

      //if (this.decorator) this.decorator.enrich(this);

      _.each(this.decorators, function(decorator) {
        decorator.decorate(this);
      }, this);
    },

    afterRender: function() {
      this.renderText();
      this.updateRender();
      this.timeChange();

      if (!this.compactView) {
        var editIcon = this.$el.find('.trpChatEdit [title]');
        editIcon.tooltip({ container: 'body', title: this.getEditTooltip.bind(this) });
      }

    },

    timeChange: function() {
      this.$el.toggleClass('isEditable', this.isInEditablePeriod());
      this.$el.toggleClass('canEdit', this.canEdit());
      this.$el.toggleClass('cantEdit', !this.canEdit());
      this.$el.toggleClass('isOld', this.isOld());
    },

    updateRender: function(changes) {
      if(!changes || 'fromUser' in changes) {
        this.$el.toggleClass('isViewers', this.isOwnMessage());
      }

      if(!changes || 'editedAt' in changes) {
        this.$el.toggleClass('hasBeenEdited', this.hasBeenEdited());
      }

      /* Don't run on the initial (changed=undefined) as its done in the template */
      if(changes && 'readBy' in changes) {
        var readByCount = this.model.get('readBy');
        var readByLabel = this.$el.find('.trpChatReadBy');
        if(readByCount) {
          readByLabel.text(this.getReadByText(readByCount));
          if(!readByLabel.is(':visible')) {
            readByLabel.show('fast');
          }
        } else {
          readByLabel.hide();
          this.$el.find('.trpChatReadBy').text();
        }
      }
    },

    getEditTooltip: function() {
      if(this.hasBeenEdited()) {
        return "Edited shortly after being sent";
      }

      if(this.canEdit()) {
        return "Edit within 4 minutes of sending";
      }

      if(this.isOwnMessage()) {
        return "It's too late to edit this message.";
      }

      return  "You can't edit someone else's message";
    },

    highlightMention: function() {
      var self = this;
      _.each(this.model.get('mentions'), function(mention) {
        var re    = new RegExp(mention.screenName, 'i');
        var user  = context().user;

        // Note: The context in mobile doesn't have a user,
        // it's actually populated at a later time over Faye.
        if (user && (user.username.match(re) || user.displayName.match(re))) {
          $(self.$el).find('.trpChatBox').addClass('mention');
        }
      });
    },

    detectKeys: function(e) {
      this.detectReturn(e);
      this.detectEscape(e);
    },

    detectReturn: function(e) {
      if(e.keyCode === 13 && (!e.ctrlKey && !e.shiftKey)) {
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
      if (this.model.get('fromUser') === null) return false;
      return this.model.get('fromUser').id === context.getUserId();
    },

    isInEditablePeriod: function() {
      var age = Date.now() - this.model.get('sent').valueOf();
      return age <= EDIT_WINDOW;
    },

    isOld: function() {
      var age = Date.now() - this.model.get('sent').valueOf();
      return age >= OLD_TIMEOUT;
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
      this.renderText();

      if (this.inputBox) {
        this.stopListening(this.inputBox);
        delete this.inputBox;
      }

    },

    showInput: function() {
      //var isAtBottom = this.scrollDelegate.isAtBottom();
      var chatInputText = this.$el.find('.trpChatText');

      // create inputview
      chatInputText.html("<textarea class='trpChatInput'></textarea>");

      var unsafeText = safeHtml.unsafe(this.model.get('text'));
      var textarea = chatInputText.find('textarea').val(unsafeText).select();

      this.inputBox = new chatInputView.ChatInputBoxView({ el: textarea });
      this.listenTo(this.inputBox, 'save', this.saveChat);
    },

    showReadBy: function(event) {
      if(this.readBy) return;
      event.preventDefault();

      this.readBy = new ReadByPopover({
        model: this.model,
        userCollection: this.userCollection,
        placement: 'vertical',
        title: 'Read By',
        targetElement: event.target
      });

      var s = this;
      this.readBy.once('hide', function() {
        s.readBy = null;
      });

      this.readBy.show();

    }

  });
  cocktail.mixin(ChatItemView, UnreadItemViewMixin);

  var ReadByView = Marionette.CollectionView.extend({
    itemView: AvatarView,
    initialize: function(options) {
      var c = new chatModels.ReadByCollection(null, { listen: true, chatMessageId: this.model.id, userCollection: options.userCollection });
      c.loading = true;
      this.collection = c;
    },
    onClose: function(){
      this.collection.unlisten();
    }
  });
  cocktail.mixin(ReadByView, TroupeViews.LoadingCollectionMixin);

  var ReadByPopover = TroupeViews.Popover.extend({
    initialize: function(options) {
      TroupeViews.Popover.prototype.initialize.apply(this, arguments);
      this.view = new ReadByView({ model: this.model, userCollection: options.userCollection });
    }
  });

  return {
    ChatItemView: ChatItemView,
    ReadByView: ReadByView,
    ReadByPopover: ReadByPopover
  };

});
