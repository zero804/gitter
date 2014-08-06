/* jshint unused:strict, browser:true,  strict:true */
/* global define:false */
define([
  'jquery',
  'underscore',
  'utils/context',
  'collections/chat',
  'views/widgets/avatar',
  'marionette',
  'views/base',
  'views/app/uiVars',
  'views/popover',
  'hbs!./tmpl/chatItemView',
  'hbs!./tmpl/statusItemView',
  'views/chat/chatInputView',
  'views/unread-item-view-mixin',
  'utils/appevents',
  'cocktail',
  'views/keyboard-events-mixin',
  'bootstrap_tooltip', // No ref
], function($, _, context, chatModels, AvatarView, Marionette, TroupeViews, uiVars, Popover,
  chatItemTemplate, statusItemTemplate, chatInputView, UnreadItemViewMixin, appEvents, cocktail, KeyboardEventMixins) {

  "use strict";

  /* @const */
  var OLD_TIMEOUT = 3600000; /*1 hour*/

  /* @const */
  var EDIT_WINDOW = 240000;

  var mouseEvents = {
    'click .js-chat-item-edit':       'toggleEdit',
    'click .js-chat-item-readby':     'showReadBy',
    'mouseover .js-chat-item-readby': 'showReadByIntent',
    'click .webhook':           'expandActivity'
  };

  var touchEvents = {
    'click .js-chat-item-edit':       'toggleEdit',
  };

  var ChatItemView = TroupeViews.Base.extend({
    attributes: {
      class: 'chat-item'
    },
    unreadItemType: 'chat',
    isEditing: false,

    events: uiVars.isMobile ? touchEvents : mouseEvents,

    keyboardEvents: {
      'chat.edit.escape': 'onKeyEscape',
      'chat.edit.send': 'onKeySend'
    },

    expandActivity: function() {
      $('.webhook .commits').slideToggle("fast");
    },

    initialize: function(options) {
      this.listenToOnce(this.model, 'change:unread', function() {
        if(!this.model.get('unread')) {
          this.$el.removeClass('unread');
        }
      });

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

    template: function (serializedData) {
      if (serializedData.status) {
        return statusItemTemplate(serializedData);
      }
      return chatItemTemplate(serializedData);
    },

    getRenderData: function() {
      var data = this.model.toJSON();

      if (data.fromUser) {
        data.username = data.fromUser.username;
      }
      data.readByText = this.getReadByText(data.readBy);
      if(!data.html) {
        data.html = _.escape(data.text);
      }
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
      if ('html' in changed /*|| 'text' in changed || 'urls' in changed || 'mentions' in changed*/) {
        this.renderText();
      }

      this.updateRender(this.model.changed);
    },

    onKeyEscape: function() {
      if(this.inputBox) {
        this.toggleEdit();
        this.focusInput();
      }
    },

    onKeySend: function(event) {
      if(this.inputBox) {
        this.inputBox.processInput();
      }
      event.preventDefault();
    },

    renderText: function() {
      // We need to parse the text a little to hyperlink known links and escape html to prevent injection
      // var links = this.model.get('urls') || [];
      // var mentions = this.model.get('mentions') || [];
      var issues = [];
      if(context.troupe().get('githubType') === 'REPO') {
        issues = this.model.get('issues') || [];
      }

      // Will only use the text when a value hasn't been returned from the server
      var html = this.model.get('html') || _.escape(this.model.get('text'));

      // Handle empty messages as deleted
      if (html.length === 0) {
        html = '<i>This message was deleted</i>';
        this.$el.addClass('deleted');
      }

      this.$el.find('.js-chat-item-text').html(html);

      _.each(this.decorators, function(decorator) {
        decorator.decorate(this);
      }, this);
    },

    afterRender: function() {
      this.renderText();
      this.updateRender();
      this.timeChange();

      if (!this.compactView) {
        var editIcon = this.$el.find('.js-chat-item-edit');
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

      if(!changes || 'burstStart' in changes) {
        this.$el.toggleClass('burstStart', this.model.get('burstStart'));
        this.$el.toggleClass('burstContinued', !this.model.get('burstStart'));
      }

      if (!changes || 'burstFinal' in changes) {
        this.$el.toggleClass('burstFinal', this.model.get('burstFinal'));
      }

      /* Don't run on the initial (changed=undefined) as its done in the template */
      if(changes && 'readBy' in changes) {
        var readByCount = this.model.get('readBy');
        var oldValue = this.model.previous('readBy');

        var readByLabel = this.$el.find('.js-chat-item-readby');

        if(readByLabel.length === 0) {
          if(readByCount) {
           readByLabel = $(document.createElement('div')).addClass('chat-item__icon--read js-chat-item-readby');
           readByLabel.insertBefore(this.$el.find('.js-chat-item-edit'));
           setTimeout(function() {
             readByLabel.addClass('readBySome');
           }, 10);
          }
        } else {
          if((oldValue === 0) !== (readByCount === 0)) {
            // Things have changed
            readByLabel.toggleClass('readBySome', !!readByCount);
          }
        }

        readByLabel.text(readByCount ? this.getReadByText(readByCount) : '');

      }
    },

    getEditTooltip: function() {
      if (this.isEmbedded()) return "You can't edit on embedded chats.";
      
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

    focusInput: function() {
      $("#chat-input-textarea").focus();
    },

    saveChat: function(newText) {
      if (this.isEditing) {
        if (this.canEdit() && newText != this.model.get('text')) {
          this.model.set('text', newText);
          this.model.set('html', null);
          this.model.save();
        }
        this.focusInput();
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
    
    isEmbedded: function () {
      return context().embedded;
    },

    isOld: function() {
      var age = Date.now() - this.model.get('sent').valueOf();
      return age >= OLD_TIMEOUT;
    },

    canEdit: function() {
      return this.isOwnMessage() && this.isInEditablePeriod() && !this.isEmbedded();
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
        this.stopListening(appEvents, 'focus.request.chat.edit');
        appEvents.trigger('chat.edit.hide');
      } else {
        if (this.canEdit()) {
          var self = this;
          this.isEditing = true;
          this.showInput();
          this.listenTo(appEvents, 'focus.request.chat.edit', function() {
            self.inputBox.$el.focus();
            appEvents.trigger('focus.change.chat.edit');
          });
          appEvents.trigger('chat.edit.show');
        }
      }
    },

    showText: function() {
      this.renderText();

      if (this.inputBox) {
        this.stopListening(this.inputBox);
        this.inputBox.remove();
        delete this.inputBox;
      }

    },

    showInput: function() {
      //var isAtBottom = this.scrollDelegate.isAtBottom();
      var chatInputText = this.$el.find('.js-chat-item-text');

      // create inputview
      chatInputText.html("<textarea class='trpChatInput'></textarea>");

      var unsafeText = this.model.get('text');

      var textarea = chatInputText.find('textarea').val(unsafeText);

      setTimeout(function() {
        textarea.focus();
        textarea.val("").val(unsafeText);
      }, 10);

      this.inputBox = new chatInputView.ChatInputBoxView({ el: textarea, editMode: true });
      this.listenTo(this.inputBox, 'save', this.saveChat);
    },

    showReadByIntent: function(e) {
      ReadByPopover.hoverTimeout(e, function() {
        this.showReadBy(e);
      }, this);
    },

    showReadBy: function(e) {
      if (this.compactView) return;

      if(this.popover) return;
      e.preventDefault();

      var popover = new ReadByPopover({
        model: this.model,
        userCollection: this.userCollection,
        scroller: this.$el.parents('.primary-scroll'),
        placement: 'vertical',
        minHeight: '88px',
        width: '300px',
        title: 'Read By',
        targetElement: e.target
      });

      popover.show();
      ReadByPopover.singleton(this, popover);
    }
  });

  cocktail.mixin(ChatItemView, KeyboardEventMixins);

  if (context.isLoggedIn()) {
    cocktail.mixin(ChatItemView, UnreadItemViewMixin);
  }

  var ReadByView = Marionette.CollectionView.extend({
    itemView: AvatarView,
    className: 'popoverReadBy',
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

  var ReadByPopover = Popover.extend({
    initialize: function(options) {
      Popover.prototype.initialize.apply(this, arguments);
      this.view = new ReadByView({ model: this.model, userCollection: options.userCollection });
    }
  });

  return {
    ChatItemView: ChatItemView,
    ReadByView: ReadByView,
    ReadByPopover: ReadByPopover
  };

});
