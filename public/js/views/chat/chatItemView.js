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
  'views/popover',
  'hbs!./tmpl/chatViewItem',
  'views/chat/chatInputView',
  'views/unread-item-view-mixin',
  'cocktail',
  'bootstrap_tooltip', // No ref
  'bootstrap-popover' // No ref
], function($, _, context, chatModels, AvatarView, Marionette, TroupeViews, Popover,
  chatItemTemplate, chatInputView, UnreadItemViewMixin, cocktail /* tooltip, popover*/) {

  "use strict";

  /** @const */
  var OLD_TIMEOUT = 3600000 /*1 hour*/;

  /** @const */
  var EDIT_WINDOW = 240000;

  var ChatItemView = TroupeViews.Base.extend({
    attributes: {
      class: 'trpChatItemContainer'
    },
    unreadItemType: 'chat',
    template: chatItemTemplate,
    isEditing: false,

    events: {
      'click .trpChatEdit':     'toggleEdit',
      'keydown textarea':       'detectEscape',
      'click .trpChatReadBy':   'showReadBy',
      'click .webhook': 'expandActivity'
    },

    expandActivity: function() {
      $('.webhook .commits').slideToggle("fast");
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
        data.username = data.fromUser.username;
        // data.displayName = data.fromUser.displayName || data.fromUser.fallbackDisplayName;
        // if (isMobile && data.displayName.length > 13) {
        //   data.displayName = data.fromUser.displayName.split(" ").shift();
        // }
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

    renderText: function() {
      // We need to parse the text a little to hyperlink known links and escape html to prevent injection
      // var links = this.model.get('urls') || [];
      // var mentions = this.model.get('mentions') || [];
      var issues = [];
      if(context().troupe.githubType === 'REPO') {
        issues = this.model.get('issues') || [];
      }

      // Will only use the text when a value hasn't been returned from the server
      var html = this.model.get('html') || _.escape(this.model.get('text'));

      this.$el.find('.trpChatText').html(html);

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
        var oldValue = this.model.previous('readBy');


        if((!!oldValue) !== (!!readByCount)) {
          var readByLabel = this.$el.find('.trpChatReadBy');
          if(readByLabel.length === 0) {
            if(readByCount) {
             readByLabel = $(document.createElement('div')).addClass('trpChatReadBy');
             readByLabel.insertBefore(this.$el.find('.trpChatEdit'));
             setTimeout(function() {
               readByLabel.addClass('readBySome');
             }, 10);
            }
          } else {
            // Things have changed
            readByLabel.toggleClass('readBySome', !!readByCount);
          }

          readByLabel.text(readByCount ? this.getReadByText(readByCount) : '');

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
          this.model.set('html', null);
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

      var unsafeText = this.model.get('text');
      var textarea = chatInputText.find('textarea').val(unsafeText);

      setTimeout(function() {
        textarea.select();
      }, 10);

      this.inputBox = new chatInputView.ChatInputBoxView({ el: textarea });
      this.listenTo(this.inputBox, 'save', this.saveChat);
    },

    showReadBy: function(event) {
      if (this.compactView) return;

      if(this.readBy) return;
      event.preventDefault();

      this.readBy = new ReadByPopover({
        model: this.model,
        userCollection: this.userCollection,
        scroller: this.$el.parents('.primary-scroll'),
        placement: 'vertical',
        minHeight: '88px',
        width: '300px',
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
