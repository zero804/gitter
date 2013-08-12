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
  './scrollDelegate',
  'hbs!./tmpl/chatViewItem',
  'views/chat/chatInputView',
  'views/unread-item-view-mixin',
  'oEmbed',
  'template/helpers/linkify',
  'bootstrap_tooltip'
], function($, _, context, log, chatModels, AvatarView, unreadItemsClient, Marionette, TroupeViews, scrollDelegates, chatItemTemplate, chatInputView, UnreadItemViewMixin, oEmbed, linkify /* tooltip*/) {

  "use strict";

  var ChatItemView = TroupeViews.Base.extend({
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

      this.userCollection = options.userCollection;
      this.scrollDelegate = options.scrollDelegate;

      this.model.on('change', function() {
        self.onChange();
      });

      if (this.isInEditablePeriod()) {
        // update once the message is not editable
        var notEditableInMS = (this.model.get('sent').valueOf() + 240000) - Date.now();
        setTimeout(function() {
          self.onChange();
        }, notEditableInMS + 50);
      }

      if (!this.isOld()) {
        var oldInMS = (this.model.get('sent').valueOf() + 3600000 /*1 hour*/) - Date.now();
        setTimeout(function() {
          self.onChange();
        }, oldInMS + 50);
      }

    },

    safe: function(text) {
      return (''+text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;').replace(/\n\r?/g, '<br />');
    },

    getRenderData: function() {
      var data = this.model.toJSON();

      data.displayName = data.fromUser.displayName;

      return data;
    },

    onChange: function() {
      if (this.model.changed.text) {
        this.renderText();
      }

      this.updateRender();
    },

    renderText: function() {
      // We need to parse the text a little to hyperlink known links and escape html to prevent injection
      this.$el.find('.trpChatText').html(String(linkify(this.safe(this.model.get('text')))));
      this.oEmbed();
    },

    afterRender: function() {
      this.renderText();
      this.updateRender();
    },

    updateRender: function() {
      this.setState();

      var editIconTooltip = (this.hasBeenEdited()) ? "Edited shortly after being sent": ((this.canEdit()) ? "Edit within 4 minutes of sending" : "It's too late to edit this message.");
      var editIcon = this.$el.find('.trpChatEdit [title]');

      if (!window._troupeCompactView) {
        editIcon.tooltip('destroy');
        editIcon.attr('title', editIconTooltip);
        editIcon.tooltip({ container: 'body' });
      }
    },

    setState: function() {
      this.$el.toggleClass('isViewers', this.isOwnMessage());
      this.$el.toggleClass('isEditable', this.isInEditablePeriod());
      this.$el.toggleClass('canEdit', this.canEdit());
      this.$el.toggleClass('cantEdit', !this.canEdit());
      this.$el.toggleClass('hasBeenEdited', this.hasBeenEdited());
      this.$el.toggleClass('hasBeenRead', this.hasBeenRead());
      this.$el.toggleClass('isOld', this.isOld());
    },

    // Note: This must only be called *once* after the element content is set from the model
    oEmbed: function() {
      // TODO: send the URL's from the server? twitter-text etc
      oEmbed.defaults.maxwidth = 370;
      var self = this;
      this.$el.find('.link').each(function(index, el) {
        oEmbed.parse(el.href, function(embed) {
          if (embed) {
            $(el).append('<div class="embed">' + embed.html + '</div>');
            self.scrollDelegate.scrollToBottom();
          }
        });
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
      this.renderText();

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
        this.scrollDelegate.$scrollOf.scrollTop(this.scrollDelegate.$container.height());
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

  _.extend(ChatItemView.prototype, UnreadItemViewMixin);


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

  return {
    ChatItemView: ChatItemView,
    ReadByView: ReadByView,
    ReadByPopover: ReadByPopover
  };

});
